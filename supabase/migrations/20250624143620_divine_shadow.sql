/*
  # WeatherXM Data Storage Schema
  
  1. New Tables
    - `weather_stations` - Weather station/device metadata
    - `weather_readings` - Time-series weather data (partitioned)
    - `weather_alerts` - Weather alert notifications
    - `xm_token_rewards` - XM token reward tracking
    - `weather_daily_aggregates` - Pre-computed daily statistics
    - `weatherxm_api_logs` - API request monitoring
    - `webhook_deliveries` - Webhook delivery tracking
    
  2. Performance Features
    - Partitioned tables for high-volume data
    - Optimized indexes for common queries
    - Materialized views for statistics
    - Automated data aggregation functions
    
  3. Data Management
    - Automated cleanup procedures
    - Data quality tracking
    - Comprehensive monitoring
*/

-- Weather stations/devices table
CREATE TABLE IF NOT EXISTS weather_stations (
    device_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    elevation INTEGER,
    installation_date DATE,
    last_maintenance DATE,
    status VARCHAR(20) DEFAULT 'active',
    owner_address VARCHAR(100),
    data_quality_rating DECIMAL(3,2) DEFAULT 0.00,
    coverage_radius INTEGER DEFAULT 10,
    sensors JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weather readings table (partitioned by time)
CREATE TABLE IF NOT EXISTS weather_readings (
    id BIGSERIAL,
    device_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    wind_speed DECIMAL(6,2),
    wind_direction INTEGER,
    wind_gusts DECIMAL(6,2),
    pressure DECIMAL(7,2),
    precipitation DECIMAL(8,2),
    solar_radiation DECIMAL(8,2),
    uv_index DECIMAL(4,2),
    visibility DECIMAL(6,2),
    cloud_cover INTEGER,
    data_quality_score INTEGER DEFAULT 100,
    validation_errors JSONB,
    validation_warnings JSONB,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Create initial monthly partitions for weather readings
DO $$
BEGIN
    -- Create partition for current month
    EXECUTE format('CREATE TABLE IF NOT EXISTS weather_readings_%s PARTITION OF weather_readings FOR VALUES FROM (%L) TO (%L)',
        to_char(date_trunc('month', CURRENT_DATE), 'YYYY_MM'),
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    );
    
    -- Create partition for next month
    EXECUTE format('CREATE TABLE IF NOT EXISTS weather_readings_%s PARTITION OF weather_readings FOR VALUES FROM (%L) TO (%L)',
        to_char(date_trunc('month', CURRENT_DATE) + INTERVAL '1 month', 'YYYY_MM'),
        date_trunc('month', CURRENT_DATE) + INTERVAL '1 month',
        date_trunc('month', CURRENT_DATE) + INTERVAL '2 months'
    );
END $$;

-- Weather alerts table (using JSONB for area data instead of PostGIS)
CREATE TABLE IF NOT EXISTS weather_alerts (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200),
    description TEXT,
    alert_data JSONB,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    affected_area JSONB, -- Store polygon coordinates as JSON instead of PostGIS
    affected_radius DECIMAL(8,2), -- Simple radius in kilometers
    center_lat DECIMAL(10,8), -- Center point latitude
    center_lng DECIMAL(11,8), -- Center point longitude
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- XM token rewards tracking
CREATE TABLE IF NOT EXISTS xm_token_rewards (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    reward_date DATE NOT NULL,
    data_points_contributed INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2) DEFAULT 0.00,
    tokens_earned DECIMAL(18,8) DEFAULT 0.00000000,
    tokens_claimed DECIMAL(18,8) DEFAULT 0.00000000,
    claim_transaction_hash VARCHAR(100),
    claim_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, reward_date)
);

-- Weather data aggregates (for performance)
CREATE TABLE IF NOT EXISTS weather_daily_aggregates (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    avg_temperature DECIMAL(5,2),
    min_temperature DECIMAL(5,2),
    max_temperature DECIMAL(5,2),
    avg_humidity DECIMAL(5,2),
    min_humidity DECIMAL(5,2),
    max_humidity DECIMAL(5,2),
    avg_wind_speed DECIMAL(6,2),
    max_wind_speed DECIMAL(6,2),
    avg_pressure DECIMAL(7,2),
    min_pressure DECIMAL(7,2),
    max_pressure DECIMAL(7,2),
    total_precipitation DECIMAL(8,2),
    max_precipitation_rate DECIMAL(8,2),
    avg_solar_radiation DECIMAL(8,2),
    max_uv_index DECIMAL(4,2),
    data_points_count INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, date)
);

-- API request logs for monitoring
CREATE TABLE IF NOT EXISTS weatherxm_api_logs (
    id BIGSERIAL PRIMARY KEY,
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size INTEGER,
    response_size INTEGER,
    error_message TEXT,
    request_timestamp TIMESTAMPTZ DEFAULT NOW(),
    device_id VARCHAR(50),
    user_agent VARCHAR(200)
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id BIGSERIAL PRIMARY KEY,
    webhook_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(200),
    delivery_status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt TIMESTAMPTZ,
    next_retry TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_weather_stations_location ON weather_stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_weather_stations_status ON weather_stations(status);

CREATE INDEX IF NOT EXISTS idx_weather_readings_device_timestamp ON weather_readings(device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_weather_readings_timestamp ON weather_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_weather_readings_quality ON weather_readings(data_quality_score);

CREATE INDEX IF NOT EXISTS idx_weather_alerts_device_active ON weather_alerts(device_id, is_active);
CREATE INDEX IF NOT EXISTS idx_weather_alerts_type_severity ON weather_alerts(alert_type, severity);
CREATE INDEX IF NOT EXISTS idx_weather_alerts_time ON weather_alerts(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_weather_alerts_location ON weather_alerts(center_lat, center_lng);

CREATE INDEX IF NOT EXISTS idx_xm_rewards_device_date ON xm_token_rewards(device_id, reward_date);
CREATE INDEX IF NOT EXISTS idx_xm_rewards_unclaimed ON xm_token_rewards(device_id) WHERE tokens_claimed < tokens_earned;

CREATE INDEX IF NOT EXISTS idx_daily_aggregates_device_date ON weather_daily_aggregates(device_id, date);

CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON weatherxm_api_logs(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_status ON weatherxm_api_logs(endpoint, status_code);

-- Functions for data aggregation
CREATE OR REPLACE FUNCTION calculate_daily_aggregates(target_date DATE)
RETURNS VOID AS $$
BEGIN
    INSERT INTO weather_daily_aggregates (
        device_id, date,
        avg_temperature, min_temperature, max_temperature,
        avg_humidity, min_humidity, max_humidity,
        avg_wind_speed, max_wind_speed,
        avg_pressure, min_pressure, max_pressure,
        total_precipitation, max_precipitation_rate,
        avg_solar_radiation, max_uv_index,
        data_points_count, avg_quality_score
    )
    SELECT 
        device_id,
        target_date,
        AVG(temperature), MIN(temperature), MAX(temperature),
        AVG(humidity), MIN(humidity), MAX(humidity),
        AVG(wind_speed), MAX(wind_speed),
        AVG(pressure), MIN(pressure), MAX(pressure),
        SUM(precipitation), MAX(precipitation),
        AVG(solar_radiation), MAX(uv_index),
        COUNT(*), AVG(data_quality_score)
    FROM weather_readings
    WHERE DATE(timestamp) = target_date
    GROUP BY device_id
    ON CONFLICT (device_id, date) DO UPDATE SET
        avg_temperature = EXCLUDED.avg_temperature,
        min_temperature = EXCLUDED.min_temperature,
        max_temperature = EXCLUDED.max_temperature,
        avg_humidity = EXCLUDED.avg_humidity,
        min_humidity = EXCLUDED.min_humidity,
        max_humidity = EXCLUDED.max_humidity,
        avg_wind_speed = EXCLUDED.avg_wind_speed,
        max_wind_speed = EXCLUDED.max_wind_speed,
        avg_pressure = EXCLUDED.avg_pressure,
        min_pressure = EXCLUDED.min_pressure,
        max_pressure = EXCLUDED.max_pressure,
        total_precipitation = EXCLUDED.total_precipitation,
        max_precipitation_rate = EXCLUDED.max_precipitation_rate,
        avg_solar_radiation = EXCLUDED.avg_solar_radiation,
        max_uv_index = EXCLUDED.max_uv_index,
        data_points_count = EXCLUDED.data_points_count,
        avg_quality_score = EXCLUDED.avg_quality_score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dLat DECIMAL;
    dLng DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLng := RADIANS(lng2 - lng1);
    
    a := SIN(dLat/2) * SIN(dLat/2) + 
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
         SIN(dLng/2) * SIN(dLng/2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update station metadata
CREATE OR REPLACE FUNCTION update_station_last_data()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE weather_stations 
    SET updated_at = NEW.timestamp
    WHERE device_id = NEW.device_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_station_last_data') THEN
        CREATE TRIGGER trigger_update_station_last_data
            AFTER INSERT ON weather_readings
            FOR EACH ROW
            EXECUTE FUNCTION update_station_last_data();
    END IF;
END $$;

-- Views for common queries
CREATE OR REPLACE VIEW active_weather_stations AS
SELECT 
    ws.*,
    wr.last_reading,
    wr.readings_count_24h
FROM weather_stations ws
LEFT JOIN (
    SELECT 
        device_id,
        MAX(timestamp) as last_reading,
        COUNT(*) as readings_count_24h
    FROM weather_readings 
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY device_id
) wr ON ws.device_id = wr.device_id
WHERE ws.status = 'active';

CREATE OR REPLACE VIEW weather_quality_summary AS
SELECT 
    device_id,
    DATE(timestamp) as date,
    AVG(data_quality_score) as avg_quality,
    MIN(data_quality_score) as min_quality,
    COUNT(*) as total_readings,
    COUNT(*) FILTER (WHERE data_quality_score >= 90) as high_quality_readings
FROM weather_readings
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY device_id, DATE(timestamp);

-- Function to find nearby weather stations
CREATE OR REPLACE FUNCTION find_nearby_stations(target_lat DECIMAL, target_lng DECIMAL, radius_km DECIMAL DEFAULT 50)
RETURNS TABLE(
    device_id VARCHAR(50),
    name VARCHAR(200),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    distance_km DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ws.device_id,
        ws.name,
        ws.latitude,
        ws.longitude,
        calculate_distance(target_lat, target_lng, ws.latitude, ws.longitude) as distance_km
    FROM weather_stations ws
    WHERE ws.status = 'active'
    AND calculate_distance(target_lat, target_lng, ws.latitude, ws.longitude) <= radius_km
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Data retention policy
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Delete raw readings older than 2 years
    DELETE FROM weather_readings 
    WHERE timestamp < NOW() - INTERVAL '2 years';
    
    -- Delete API logs older than 90 days
    DELETE FROM weatherxm_api_logs 
    WHERE request_timestamp < NOW() - INTERVAL '90 days';
    
    -- Delete processed webhook deliveries older than 30 days
    DELETE FROM webhook_deliveries 
    WHERE created_at < NOW() - INTERVAL '30 days' 
    AND delivery_status = 'delivered';
    
    -- Clean up old alert records older than 1 year
    DELETE FROM weather_alerts
    WHERE created_at < NOW() - INTERVAL '1 year'
    AND is_active = false;
END;
$$ LANGUAGE plpgsql;

-- Function to create monthly partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partition(target_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := date_trunc('month', target_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'weather_readings_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF weather_readings FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on all tables
ALTER TABLE weather_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE xm_token_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_daily_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE weatherxm_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to read weather data
CREATE POLICY "Allow authenticated users to read weather stations" ON weather_stations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read weather readings" ON weather_readings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read weather alerts" ON weather_alerts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read daily aggregates" ON weather_daily_aggregates
    FOR SELECT TO authenticated USING (true);

-- Service role policies for data management
CREATE POLICY "Allow service role full access to weather stations" ON weather_stations
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to weather readings" ON weather_readings
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to weather alerts" ON weather_alerts
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to xm rewards" ON xm_token_rewards
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to daily aggregates" ON weather_daily_aggregates
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to api logs" ON weatherxm_api_logs
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role full access to webhook deliveries" ON webhook_deliveries
    FOR ALL TO service_role USING (true);