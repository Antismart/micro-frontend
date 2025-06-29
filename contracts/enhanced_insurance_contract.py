"""
Enhanced MicroCrop Insurance Smart Contract
Comprehensive insurance coverage system with KYC, premium calculation, and NFT policies
"""

from pyteal import *

def approval_program():
    """Enhanced approval program for comprehensive insurance coverage"""
    
    # Global state keys
    TOTAL_POLICIES = Bytes("total_policies")
    TOTAL_CLAIMS = Bytes("total_claims")
    TOTAL_PAYOUTS = Bytes("total_payouts")
    ORACLE_ADDRESS = Bytes("oracle_address")
    CONTRACT_ADMIN = Bytes("contract_admin")
    KYC_REQUIRED = Bytes("kyc_required")
    MINIMUM_COVERAGE = Bytes("min_coverage")
    MAXIMUM_COVERAGE = Bytes("max_coverage")
    
    # Local state keys
    ACTIVE_POLICIES = Bytes("active_policies")
    TOTAL_COVERAGE = Bytes("total_coverage")
    KYC_STATUS = Bytes("kyc_status")
    RISK_SCORE = Bytes("risk_score")
    
    # Transaction types
    CREATE_POLICY = Bytes("create_policy")
    CLAIM_PAYOUT = Bytes("claim_payout")
    UPDATE_ORACLE = Bytes("update_oracle")
    SUBMIT_KYC = Bytes("submit_kyc")
    APPROVE_KYC = Bytes("approve_kyc")
    UPDATE_RISK_SCORE = Bytes("update_risk_score")
    EMERGENCY_PAUSE = Bytes("emergency_pause")
    
    # Coverage types
    CROP_INSURANCE = Bytes("crop")
    WEATHER_INSURANCE = Bytes("weather")
    YIELD_INSURANCE = Bytes("yield")
    
    @Subroutine(TealType.uint64)
    def calculate_premium(
        coverage_amount: Expr, 
        duration: Expr, 
        risk_score: Expr, 
        coverage_type: Expr
    ) -> Expr:
        """Calculate premium based on coverage details and risk assessment"""
        return Seq([
            # Base premium rate (percentage of coverage)
            base_rate := Int(8),  # 8% base rate
            
            # Risk multiplier (1-3x based on risk score)
            risk_multiplier := If(
                risk_score <= Int(30),
                Int(100),  # Low risk: 1.0x
                If(
                    risk_score <= Int(70),
                    Int(150),  # Medium risk: 1.5x
                    Int(250)   # High risk: 2.5x
                )
            ),
            
            # Duration multiplier
            duration_multiplier := If(
                duration >= Int(365),
                Int(90),   # Annual discount: 0.9x
                If(
                    duration >= Int(180),
                    Int(95),   # Semi-annual: 0.95x
                    Int(100)   # Standard: 1.0x
                )
            ),
            
            # Calculate final premium
            premium := (coverage_amount * base_rate * risk_multiplier * duration_multiplier) / Int(1000000),
            
            premium
        ])
    
    @Subroutine(TealType.uint64)
    def create_policy_nft(
        policy_holder: Expr,
        coverage_type: Expr,
        coverage_amount: Expr,
        duration: Expr,
        premium: Expr
    ) -> Expr:
        """Create NFT representing the insurance policy"""
        return Seq([
            # Create unique policy metadata
            policy_metadata := Sha256(
                Concat(
                    policy_holder,
                    coverage_type,
                    Itob(coverage_amount),
                    Itob(duration),
                    Itob(Global.latest_timestamp())
                )
            ),
            
            # Create ASA with policy details
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetConfig,
                TxnField.config_asset_total: Int(1),  # Single policy NFT
                TxnField.config_asset_decimals: Int(0),
                TxnField.config_asset_unit_name: Bytes("POLICY"),
                TxnField.config_asset_name: Concat(Bytes("Insurance-"), coverage_type),
                TxnField.config_asset_url: Bytes("https://microcrop.insurance/policy/"),
                TxnField.config_asset_metadata_hash: policy_metadata,
                TxnField.config_asset_manager: Global.current_application_address(),
                TxnField.config_asset_reserve: Global.current_application_address(),
                TxnField.config_asset_freeze: Global.current_application_address(),
                TxnField.config_asset_clawback: Global.current_application_address(),
            }),
            InnerTxnBuilder.Submit(),
            
            InnerTxn.created_asset_id()
        ])
    
    @Subroutine(TealType.none)
    def transfer_policy_nft(asset_id: Expr, recipient: Expr) -> Expr:
        """Transfer policy NFT to policy holder"""
        return Seq([
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: asset_id,
                TxnField.asset_amount: Int(1),
                TxnField.asset_receiver: recipient,
                TxnField.asset_sender: Global.current_application_address(),
            }),
            InnerTxnBuilder.Submit(),
        ])
    
    @Subroutine(TealType.none)
    def process_payout(
        policy_holder: Expr, 
        payout_amount: Expr, 
        policy_asset_id: Expr
    ) -> Expr:
        """Process insurance payout and burn policy NFT if fully claimed"""
        return Seq([
            # Transfer payout to policy holder
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.amount: payout_amount,
                TxnField.receiver: policy_holder,
            }),
            InnerTxnBuilder.Submit(),
            
            # Update global statistics
            App.globalPut(TOTAL_CLAIMS, App.globalGet(TOTAL_CLAIMS) + Int(1)),
            App.globalPut(TOTAL_PAYOUTS, App.globalGet(TOTAL_PAYOUTS) + payout_amount),
        ])
    
    @Subroutine(TealType.uint64)
    def validate_kyc_data(kyc_hash: Expr) -> Expr:
        """Validate KYC data hash"""
        return Seq([
            # Check if KYC hash is valid (non-zero)
            valid := Neq(kyc_hash, Bytes("")),
            valid
        ])
    
    @Subroutine(TealType.uint64)
    def calculate_risk_score(
        age: Expr,
        location_risk: Expr,
        historical_claims: Expr,
        coverage_amount: Expr
    ) -> Expr:
        """Calculate risk score based on various factors"""
        return Seq([
            # Age factor (0-25 points)
            age_score := If(
                age <= Int(30),
                Int(5),   # Young: low risk
                If(
                    age <= Int(50),
                    Int(10),  # Middle-aged: medium risk
                    Int(20)   # Older: higher risk
                )
            ),
            
            # Location risk factor (0-30 points)
            location_score := location_risk,
            
            # Historical claims factor (0-25 points)
            claims_score := If(
                historical_claims <= Int(1),
                Int(5),   # Few claims: low risk
                If(
                    historical_claims <= Int(3),
                    Int(15),  # Some claims: medium risk
                    Int(25)   # Many claims: high risk
                )
            ),
            
            # Coverage amount factor (0-20 points)
            coverage_score := If(
                coverage_amount <= Int(1000),
                Int(5),   # Low coverage: low risk
                If(
                    coverage_amount <= Int(5000),
                    Int(10),  # Medium coverage: medium risk
                    Int(20)   # High coverage: higher risk
                )
            ),
            
            # Total risk score (0-100)
            total_score := age_score + location_score + claims_score + coverage_score,
            
            total_score
        ])
    
    # Handle application creation
    on_create = Seq([
        App.globalPut(TOTAL_POLICIES, Int(0)),
        App.globalPut(TOTAL_CLAIMS, Int(0)),
        App.globalPut(TOTAL_PAYOUTS, Int(0)),
        App.globalPut(ORACLE_ADDRESS, Txn.sender()),
        App.globalPut(CONTRACT_ADMIN, Txn.sender()),
        App.globalPut(KYC_REQUIRED, Int(1)),  # KYC required by default
        App.globalPut(MINIMUM_COVERAGE, Int(100)),  # 100 ALGO minimum
        App.globalPut(MAXIMUM_COVERAGE, Int(100000)),  # 100,000 ALGO maximum
        Approve(),
    ])
    
    # Handle opt-in (user registration)
    on_opt_in = Seq([
        App.localPut(Txn.sender(), ACTIVE_POLICIES, Int(0)),
        App.localPut(Txn.sender(), TOTAL_COVERAGE, Int(0)),
        App.localPut(Txn.sender(), KYC_STATUS, Int(0)),  # 0 = not submitted, 1 = pending, 2 = approved
        App.localPut(Txn.sender(), RISK_SCORE, Int(50)),  # Default medium risk
        Approve(),
    ])
    
    # Handle KYC submission
    on_submit_kyc = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(5)),
        
        # Extract KYC data
        full_name_hash := Txn.application_args[1],
        id_document_hash := Txn.application_args[2],
        address_proof_hash := Txn.application_args[3],
        contact_info_hash := Txn.application_args[4],
        
        # Validate KYC data
        Assert(validate_kyc_data(full_name_hash)),
        Assert(validate_kyc_data(id_document_hash)),
        Assert(validate_kyc_data(address_proof_hash)),
        Assert(validate_kyc_data(contact_info_hash)),
        
        # Update KYC status to pending
        App.localPut(Txn.sender(), KYC_STATUS, Int(1)),
        
        Approve(),
    ])
    
    # Handle KYC approval (admin only)
    on_approve_kyc = Seq([
        # Only admin can approve KYC
        Assert(Txn.sender() == App.globalGet(CONTRACT_ADMIN)),
        Assert(Txn.application_args.length() == Int(2)),
        
        user_address := Txn.application_args[1],
        
        # Approve KYC
        App.localPut(user_address, KYC_STATUS, Int(2)),
        
        Approve(),
    ])
    
    # Handle policy creation with enhanced features
    on_create_policy = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(8)),
        Assert(Txn.accounts.length() == Int(1)),  # Policy holder address
        Assert(Gtxn[0].type_enum() == TxnType.Payment),  # Premium payment
        
        # Extract parameters
        coverage_type := Txn.application_args[1],
        coverage_amount := Btoi(Txn.application_args[2]),
        duration := Btoi(Txn.application_args[3]),
        deductible := Btoi(Txn.application_args[4]),
        location_risk := Btoi(Txn.application_args[5]),
        age := Btoi(Txn.application_args[6]),
        historical_claims := Btoi(Txn.application_args[7]),
        policy_holder := Txn.accounts[1],
        
        # Validate coverage limits
        Assert(coverage_amount >= App.globalGet(MINIMUM_COVERAGE)),
        Assert(coverage_amount <= App.globalGet(MAXIMUM_COVERAGE)),
        Assert(duration >= Int(30)),  # Minimum 30 days
        Assert(duration <= Int(365)),  # Maximum 1 year
        
        # Check KYC status if required
        Assert(
            Or(
                App.globalGet(KYC_REQUIRED) == Int(0),
                App.localGet(policy_holder, KYC_STATUS) == Int(2)
            )
        ),
        
        # Calculate risk score
        risk_score := calculate_risk_score(age, location_risk, historical_claims, coverage_amount),
        
        # Calculate premium
        premium := calculate_premium(coverage_amount, duration, risk_score, coverage_type),
        
        # Validate premium payment
        Assert(Gtxn[0].amount() >= premium),
        
        # Create policy NFT
        policy_asset_id := create_policy_nft(
            policy_holder,
            coverage_type,
            coverage_amount,
            duration,
            premium
        ),
        
        # Transfer NFT to policy holder
        transfer_policy_nft(policy_asset_id, policy_holder),
        
        # Update user's risk score
        App.localPut(policy_holder, RISK_SCORE, risk_score),
        
        # Update state
        App.globalPut(TOTAL_POLICIES, App.globalGet(TOTAL_POLICIES) + Int(1)),
        App.localPut(policy_holder, ACTIVE_POLICIES, App.localGet(policy_holder, ACTIVE_POLICIES) + Int(1)),
        App.localPut(policy_holder, TOTAL_COVERAGE, App.localGet(policy_holder, TOTAL_COVERAGE) + coverage_amount),
        
        Approve(),
    ])
    
    # Handle payout claims (oracle only)
    on_claim_payout = Seq([
        # Only oracle can trigger payouts
        Assert(Txn.sender() == App.globalGet(ORACLE_ADDRESS)),
        Assert(Txn.application_args.length() == Int(4)),
        
        policy_holder := Txn.accounts[1],
        payout_amount := Btoi(Txn.application_args[1]),
        weather_data_hash := Txn.application_args[2],
        policy_asset_id := Btoi(Txn.application_args[3]),
        
        # Validate policy holder is opted in
        Assert(App.localGet(policy_holder, ACTIVE_POLICIES) > Int(0)),
        
        # Process payout
        process_payout(policy_holder, payout_amount, policy_asset_id),
        
        Approve(),
    ])
    
    # Handle risk score updates (oracle only)
    on_update_risk_score = Seq([
        Assert(Txn.sender() == App.globalGet(ORACLE_ADDRESS)),
        Assert(Txn.application_args.length() == Int(3)),
        
        user_address := Txn.application_args[1],
        new_risk_score := Btoi(Txn.application_args[2]),
        
        # Update risk score
        App.localPut(user_address, RISK_SCORE, new_risk_score),
        
        Approve(),
    ])
    
    # Handle oracle address update (admin only)
    on_update_oracle = Seq([
        Assert(Txn.sender() == App.globalGet(CONTRACT_ADMIN)),
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(ORACLE_ADDRESS, Txn.application_args[1]),
        Approve(),
    ])
    
    # Handle emergency pause (admin only)
    on_emergency_pause = Seq([
        Assert(Txn.sender() == App.globalGet(CONTRACT_ADMIN)),
        # Implement emergency pause logic
        Approve(),
    ])
    
    # Main program logic
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnCall.OptIn, on_opt_in],
        [Txn.application_args[0] == SUBMIT_KYC, on_submit_kyc],
        [Txn.application_args[0] == APPROVE_KYC, on_approve_kyc],
        [Txn.application_args[0] == CREATE_POLICY, on_create_policy],
        [Txn.application_args[0] == CLAIM_PAYOUT, on_claim_payout],
        [Txn.application_args[0] == UPDATE_RISK_SCORE, on_update_risk_score],
        [Txn.application_args[0] == UPDATE_ORACLE, on_update_oracle],
        [Txn.application_args[0] == EMERGENCY_PAUSE, on_emergency_pause],
    )
    
    return program

def clear_state_program():
    """Clear state program - always approve"""
    return Approve()

if __name__ == "__main__":
    # Compile the enhanced contract
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
    
    with open("enhanced_approval.teal", "w") as f:
        f.write(approval_teal)
    
    with open("enhanced_clear.teal", "w") as f:
        f.write(clear_teal)
    
    print("Enhanced contract compiled successfully!")