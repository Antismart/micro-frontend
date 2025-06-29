/**
 * Weather Chart Component using Recharts
 */

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { WeatherData } from '../../../types';
import { format } from 'date-fns';

interface WeatherChartProps {
  data: WeatherData[];
  type: 'temperature' | 'rainfall';
  height?: number;
}

export const WeatherChart: React.FC<WeatherChartProps> = ({ 
  data, 
  type, 
  height = 300 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No weather data available</p>
      </div>
    );
  }

  // Group data by day for daily charts
  const dailyData = data.reduce((acc, reading) => {
    const date = format(new Date(reading.timestamp), 'MMM dd');
    
    if (!acc[date]) {
      acc[date] = {
        date,
        temperatures: [],
        rainfalls: [],
        count: 0
      };
    }
    
    acc[date].temperatures.push(reading.temperature);
    acc[date].rainfalls.push(reading.rainfall);
    acc[date].count++;
    
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(dailyData).map((day: any) => ({
    date: day.date,
    avgTemperature: day.temperatures.reduce((a: number, b: number) => a + b, 0) / day.temperatures.length,
    maxTemperature: Math.max(...day.temperatures),
    minTemperature: Math.min(...day.temperatures),
    totalRainfall: day.rainfalls.reduce((a: number, b: number) => a + b, 0),
    avgRainfall: day.rainfalls.reduce((a: number, b: number) => a + b, 0) / day.rainfalls.length
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
              {type === 'temperature' ? '°C' : 'mm'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'temperature') {
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Temperature Trends</h3>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="maxTemperature" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Max Temp"
              dot={{ fill: '#ef4444', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="avgTemperature" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Avg Temp"
              dot={{ fill: '#3b82f6', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="minTemperature" 
              stroke="#06b6d4" 
              strokeWidth={2}
              name="Min Temp"
              dot={{ fill: '#06b6d4', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rainfall Data</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="totalRainfall" 
            fill="#10b981"
            name="Total Rainfall"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};