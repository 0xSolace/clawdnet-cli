#!/usr/bin/env node

import { Command } from 'commander';
import { registerCommand } from './commands/register';
import { invokeCommand } from './commands/invoke';
import { statusCommand } from './commands/status';
import { walletCommand } from './commands/wallet';
import { setOutputOptions, colors, logError } from './lib/output';

const program = new Command();

program
  .name('clawdnet')
  .description('CLI tool for ClawdNet - AI agent network')
  .version('1.0.0')
  .option('--json', 'output in JSON format')
  .option('--no-color', 'disable colored output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    setOutputOptions({
      json: opts.json,
      color: opts.color !== false,
    });
  });

// ============= REGISTER =============
program
  .command('register')
  .description('Register an agent with ClawdNet')
  .option('-n, --name <name>', 'agent name')
  .option('-t, --type <type>', 'agent type (assistant, worker, service)')
  .option('-d, --description <desc>', 'agent description')
  .option('-e, --endpoint <url>', 'agent API endpoint')
  .option('--capabilities <list>', 'capabilities (comma-separated)')
  .option('--skills <list>', 'skills (comma-separated)')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Interactive registration')}
  $ clawdnet register

  ${colors.dim('# Quick registration')}
  $ clawdnet register --name "MyBot" --type assistant --endpoint "https://my-bot.com"
`)
  .action(async (options) => {
    try {
      await registerCommand(options);
    } catch (error) {
      logError('Registration failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= INVOKE =============
program
  .command('invoke <handle> <skill>')
  .description('Call another agent')
  .option('-p, --payload <json>', 'JSON payload for the skill')
  .option('-t, --timeout <ms>', 'timeout in milliseconds', parseInt)
  .option('-w, --wait', 'wait for completion')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Invoke a skill')}
  $ clawdnet invoke @translator translate --payload '{"text": "Hello"}'

  ${colors.dim('# With timeout')}
  $ clawdnet invoke @worker process --timeout 30000
`)
  .action(async (handle: string, skill: string, options) => {
    try {
      await invokeCommand(handle, skill, { ...options, ...program.opts() });
    } catch (error) {
      logError('Invocation failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= STATUS =============
program
  .command('status')
  .description('Check agent status')
  .option('-a, --agent <handle>', 'check specific agent status')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Check your status')}
  $ clawdnet status

  ${colors.dim('# Check another agent')}
  $ clawdnet status --agent @translator
`)
  .action(async (options) => {
    try {
      await statusCommand({ ...options, ...program.opts() });
    } catch (error) {
      logError('Status check failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// ============= WALLET =============
program
  .command('wallet')
  .description('Manage wallet')
  .option('-b, --balance', 'show wallet balance')
  .option('-a, --address', 'show wallet address')
  .option('-s, --send <address>', 'send tokens to address')
  .option('--amount <amount>', 'amount to send')
  .addHelpText('after', `
Examples:
  ${colors.dim('# Show wallet info')}
  $ clawdnet wallet

  ${colors.dim('# Check balance')}
  $ clawdnet wallet --balance

  ${colors.dim('# Send tokens')}
  $ clawdnet wallet --send 0x123... --amount 10
`)
  .action(async (options) => {
    try {
      await walletCommand({ ...options, ...program.opts() });
    } catch (error) {
      logError('Wallet operation failed', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  logError(`Unknown command: ${program.args.join(' ')}`);
  console.log(`\nRun ${colors.cyan('clawdnet --help')} to see available commands.`);
  process.exit(1);
});

// Custom help
program.addHelpText('after', `
${colors.bold('Quick Start:')}
  1. ${colors.cyan('clawdnet register')}  - Register your agent
  2. ${colors.cyan('clawdnet status')}    - Check your status
  3. ${colors.cyan('clawdnet invoke')}    - Call another agent
  4. ${colors.cyan('clawdnet wallet')}    - Manage your wallet

${colors.bold('Global Options:')}
  --json       Output in JSON format (machine-readable)
  --no-color   Disable colored output

${colors.dim('Documentation: https://clawdnet.xyz/docs/cli')}
`);

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}