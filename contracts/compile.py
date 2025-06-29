"""
Contract compilation script for MicroCrop Insurance
"""

import os
import sys
from pyteal import *

def compile_contract():
    """Compile the insurance smart contract"""
    try:
        # Import the contract
        from insurance_contract import approval_program, clear_state_program
        
        # Compile approval program
        approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
        
        # Compile clear state program  
        clear_teal = compileTeal(clear_state_program(), Mode.Application, version=8)
        
        # Create contracts directory if it doesn't exist
        os.makedirs("contracts/build", exist_ok=True)
        
        # Write compiled contracts
        with open("contracts/build/approval.teal", "w") as f:
            f.write(approval_teal)
        
        with open("contracts/build/clear.teal", "w") as f:
            f.write(clear_teal)
        
        print("✅ Contract compiled successfully!")
        print(f"📁 Approval program: contracts/build/approval.teal")
        print(f"📁 Clear program: contracts/build/clear.teal")
        
        return True
        
    except Exception as e:
        print(f"❌ Compilation failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = compile_contract()
    sys.exit(0 if success else 1)