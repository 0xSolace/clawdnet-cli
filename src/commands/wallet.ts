import { log, logSuccess, logError, colors } from '../lib/output';
import { getConfig } from '../lib/config';
import { apiRequest } from '../lib/api';
import { prompt } from '../lib/prompt';

export interface WalletOptions {
  balance?: boolean;
  address?: boolean;
  send?: string;
  amount?: string;
  json?: boolean;
}

export async function walletCommand(options: WalletOptions) {
  const config = await getConfig();
  
  if (!config?.agentId) {
    throw new Error('Not registered. Run `clawdnet register` first.');
  }

  if (!options.json) {
    log(`${colors.bold('💰 Wallet Management')}`);
  }

  try {
    const wallet = await apiRequest(`/agents/${config.agentId}/wallet`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    // Handle specific actions
    if (options.balance) {
      return await showBalance(wallet, options.json);
    }

    if (options.address) {
      return await showAddress(wallet, options.json);
    }

    if (options.send) {
      if (!options.amount) {
        if (options.json) {
          console.log(JSON.stringify({ error: 'Amount required for send operation' }));
          return;
        }
        throw new Error('Amount required. Use --amount flag.');
      }
      return await sendTokens(options.send, options.amount, config.apiKey, options.json);
    }

    // Show full wallet info by default
    if (options.json) {
      console.log(JSON.stringify(wallet));
      return;
    }

    logSuccess('✅ Wallet information');
    log(`${colors.cyan('Address:')} ${wallet.address}`);
    log(`${colors.cyan('Balance:')} ${wallet.balance} CLAW`);
    log(`${colors.cyan('Network:')} ${wallet.network}`);
    
    if (wallet.pendingTransactions && wallet.pendingTransactions.length > 0) {
      log(`${colors.cyan('Pending transactions:')} ${wallet.pendingTransactions.length}`);
    }

    // Recent transactions
    if (wallet.recentTransactions && wallet.recentTransactions.length > 0) {
      log('\n📜 Recent Transactions:');
      for (const tx of wallet.recentTransactions.slice(0, 5)) {
        const direction = tx.from === wallet.address ? '📤' : '📥';
        const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount;
        log(`  ${direction} ${amount} CLAW - ${new Date(tx.timestamp).toLocaleDateString()}`);
      }
    }

  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    throw new Error(`Wallet operation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function showBalance(wallet: any, isJson?: boolean) {
  if (isJson) {
    console.log(JSON.stringify({ balance: wallet.balance, token: 'CLAW' }));
    return;
  }

  log(`${colors.cyan('Balance:')} ${colors.bold(wallet.balance + ' CLAW')}`);
}

async function showAddress(wallet: any, isJson?: boolean) {
  if (isJson) {
    console.log(JSON.stringify({ address: wallet.address, network: wallet.network }));
    return;
  }

  log(`${colors.cyan('Address:')} ${colors.bold(wallet.address)}`);
  log(`${colors.cyan('Network:')} ${wallet.network}`);
}

async function sendTokens(toAddress: string, amount: string, apiKey: string, isJson?: boolean) {
  // Validate amount
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error('Invalid amount');
  }

  // Validate address format (basic check)
  if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
    throw new Error('Invalid address format');
  }

  if (!isJson) {
    log(`${colors.yellow('⚠️  Confirm transaction:')}`);
    log(`  To: ${toAddress}`);
    log(`  Amount: ${amount} CLAW`);
    
    const confirm = await prompt('Continue? (y/N):', { default: 'n' });
    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      log('Transaction cancelled');
      return;
    }
  }

  try {
    const response = await apiRequest('/wallet/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: toAddress,
        amount: parsedAmount,
      }),
    });

    if (isJson) {
      console.log(JSON.stringify(response));
      return;
    }

    logSuccess('✅ Transaction submitted');
    log(`${colors.cyan('Transaction hash:')} ${response.txHash}`);
    log(`${colors.cyan('Status:')} ${response.status}`);
    
    if (response.status === 'pending') {
      log(`${colors.yellow('⏳ Transaction is pending confirmation...')}`);
    }

  } catch (error) {
    throw new Error(`Send failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}