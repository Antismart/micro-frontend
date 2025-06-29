"""
MicroCrop Insurance Smart Contract (Simplified - No KYC)
Handles policy creation, ASA minting, and payout logic on Algorand
"""

from pyteal import *

def approval_program():
    """Main approval program for the insurance contract"""
    
    # Global state keys
    TOTAL_POLICIES = Bytes("total_policies")
    TOTAL_CLAIMS = Bytes("total_claims")
    TOTAL_PAYOUTS = Bytes("total_payouts")
    ORACLE_ADDRESS = Bytes("oracle_address")
    
    # Local state keys
    ACTIVE_POLICIES = Bytes("active_policies")
    TOTAL_COVERAGE = Bytes("total_coverage")
    
    # Transaction types
    CREATE_POLICY = Bytes("create_policy")
    CLAIM_PAYOUT = Bytes("claim_payout")
    UPDATE_ORACLE = Bytes("update_oracle")
    
    @Subroutine(TealType.uint64)
    def create_policy_asa(crop_type: Expr, coverage_amount: Expr, start_date: Expr, end_date: Expr) -> Expr:
        """Create an ASA representing an insurance policy"""
        return Seq([
            # Create ASA with policy metadata
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetConfig,
                TxnField.config_asset_total: Int(1),  # Single policy token
                TxnField.config_asset_decimals: Int(0),
                TxnField.config_asset_unit_name: Bytes("POLICY"),
                TxnField.config_asset_name: Concat(Bytes("CropInsurance-"), crop_type),
                TxnField.config_asset_url: Bytes("https://microcrop.insurance/policy/"),
                TxnField.config_asset_metadata_hash: Sha256(
                    Concat(
                        crop_type,
                        Itob(coverage_amount),
                        Itob(start_date),
                        Itob(end_date)
                    )
                ),
                TxnField.config_asset_manager: Global.current_application_address(),
                TxnField.config_asset_reserve: Global.current_application_address(),
                TxnField.config_asset_freeze: Global.current_application_address(),
                TxnField.config_asset_clawback: Global.current_application_address(),
            }),
            InnerTxnBuilder.Submit(),
            InnerTxn.created_asset_id()
        ])
    
    @Subroutine(TealType.none)
    def transfer_policy_to_farmer(asset_id: Expr, farmer_address: Expr) -> Expr:
        """Transfer policy ASA to farmer's address"""
        return Seq([
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: asset_id,
                TxnField.asset_amount: Int(1),
                TxnField.asset_receiver: farmer_address,
                TxnField.asset_sender: Global.current_application_address(),
            }),
            InnerTxnBuilder.Submit(),
        ])
    
    @Subroutine(TealType.none)
    def process_payout(policy_holder: Expr, payout_amount: Expr) -> Expr:
        """Process insurance payout to policy holder"""
        return Seq([
            # Transfer Algos to policy holder
            InnerTxnBuilder.Begin(),
            InnerTxnBuilder.SetFields({
                TxnField.type_enum: TxnType.Payment,
                TxnField.amount: payout_amount,
                TxnField.receiver: policy_holder,
            }),
            InnerTxnBuilder.Submit(),
            
            # Update global state
            App.globalPut(TOTAL_CLAIMS, App.globalGet(TOTAL_CLAIMS) + Int(1)),
            App.globalPut(TOTAL_PAYOUTS, App.globalGet(TOTAL_PAYOUTS) + payout_amount),
        ])
    
    # Handle application creation
    on_create = Seq([
        App.globalPut(TOTAL_POLICIES, Int(0)),
        App.globalPut(TOTAL_CLAIMS, Int(0)),
        App.globalPut(TOTAL_PAYOUTS, Int(0)),
        App.globalPut(ORACLE_ADDRESS, Txn.sender()),
        Approve(),
    ])
    
    # Handle opt-in (farmer registration)
    on_opt_in = Seq([
        App.localPut(Txn.sender(), ACTIVE_POLICIES, Int(0)),
        App.localPut(Txn.sender(), TOTAL_COVERAGE, Int(0)),
        Approve(),
    ])
    
    # Handle policy creation (simplified without KYC)
    on_create_policy = Seq([
        # Validate inputs
        Assert(Txn.application_args.length() == Int(5)),
        Assert(Txn.accounts.length() == Int(1)),  # Farmer address
        Assert(Gtxn[0].type_enum() == TxnType.Payment),  # Premium payment
        
        # Extract parameters
        crop_type := Txn.application_args[1],
        coverage_amount := Btoi(Txn.application_args[2]),
        start_date := Btoi(Txn.application_args[3]),
        end_date := Btoi(Txn.application_args[4]),
        farmer_address := Txn.accounts[1],
        premium_paid := Gtxn[0].amount(),
        
        # Validate premium amount (should be percentage of coverage)
        expected_premium := coverage_amount / Int(10),  # 10% premium rate
        Assert(premium_paid >= expected_premium),
        
        # Create policy ASA
        policy_asset_id := create_policy_asa(crop_type, coverage_amount, start_date, end_date),
        
        # Transfer policy to farmer
        transfer_policy_to_farmer(policy_asset_id, farmer_address),
        
        # Update state
        App.globalPut(TOTAL_POLICIES, App.globalGet(TOTAL_POLICIES) + Int(1)),
        App.localPut(farmer_address, ACTIVE_POLICIES, App.localGet(farmer_address, ACTIVE_POLICIES) + Int(1)),
        App.localPut(farmer_address, TOTAL_COVERAGE, App.localGet(farmer_address, TOTAL_COVERAGE) + coverage_amount),
        
        Approve(),
    ])
    
    # Handle payout claims (called by oracle)
    on_claim_payout = Seq([
        # Only oracle can trigger payouts
        Assert(Txn.sender() == App.globalGet(ORACLE_ADDRESS)),
        Assert(Txn.application_args.length() == Int(3)),
        
        policy_holder := Txn.accounts[1],
        payout_amount := Btoi(Txn.application_args[1]),
        weather_data_hash := Txn.application_args[2],
        
        # Validate policy holder is opted in
        Assert(App.localGet(policy_holder, ACTIVE_POLICIES) > Int(0)),
        
        # Process payout
        process_payout(policy_holder, payout_amount),
        
        Approve(),
    ])
    
    # Handle oracle address update
    on_update_oracle = Seq([
        Assert(Txn.sender() == Global.creator_address()),
        Assert(Txn.application_args.length() == Int(2)),
        App.globalPut(ORACLE_ADDRESS, Txn.application_args[1]),
        Approve(),
    ])
    
    # Main program logic
    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnCall.OptIn, on_opt_in],
        [Txn.application_args[0] == CREATE_POLICY, on_create_policy],
        [Txn.application_args[0] == CLAIM_PAYOUT, on_claim_payout],
        [Txn.application_args[0] == UPDATE_ORACLE, on_update_oracle],
    )
    
    return program

def clear_state_program():
    """Clear state program - always approve"""
    return Approve()

if __name__ == "__main__":
    # Compile the contract
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
    
    with open("approval.teal", "w") as f:
        f.write(approval_teal)
    
    with open("clear.teal", "w") as f:
        f.write(clear_teal)
    
    print("Contract compiled successfully!")