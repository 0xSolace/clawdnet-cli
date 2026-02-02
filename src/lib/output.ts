import chalk from 'chalk';

interface OutputOptions {
  json: boolean;
  color: boolean;
}

let outputOptions: OutputOptions = {
  json: false,
  color: true,
};

export function setOutputOptions(options: Partial<OutputOptions>) {
  outputOptions = { ...outputOptions, ...options };
}

// Color helpers
export const colors = {
  red: (text: string) => outputOptions.color ? chalk.red(text) : text,
  green: (text: string) => outputOptions.color ? chalk.green(text) : text,
  yellow: (text: string) => outputOptions.color ? chalk.yellow(text) : text,
  blue: (text: string) => outputOptions.color ? chalk.blue(text) : text,
  cyan: (text: string) => outputOptions.color ? chalk.cyan(text) : text,
  magenta: (text: string) => outputOptions.color ? chalk.magenta(text) : text,
  white: (text: string) => outputOptions.color ? chalk.white(text) : text,
  gray: (text: string) => outputOptions.color ? chalk.gray(text) : text,
  dim: (text: string) => outputOptions.color ? chalk.dim(text) : text,
  bold: (text: string) => outputOptions.color ? chalk.bold(text) : text,
  underline: (text: string) => outputOptions.color ? chalk.underline(text) : text,
  inverse: (text: string) => outputOptions.color ? chalk.inverse(text) : text,
};

export function log(message: string) {
  if (!outputOptions.json) {
    console.log(message);
  }
}

export function logSuccess(message: string) {
  if (!outputOptions.json) {
    console.log(colors.green(message));
  }
}

export function logError(title: string, message?: string) {
  if (outputOptions.json) {
    console.log(JSON.stringify({
      error: true,
      title,
      message: message || title,
    }));
  } else {
    console.error(colors.red(title));
    if (message && message !== title) {
      console.error(colors.dim(message));
    }
  }
}

export function logWarning(message: string) {
  if (!outputOptions.json) {
    console.log(colors.yellow(message));
  }
}

export function logInfo(message: string) {
  if (!outputOptions.json) {
    console.log(colors.cyan(message));
  }
}

export function logDebug(message: string) {
  if (!outputOptions.json && process.env.DEBUG) {
    console.log(colors.dim(`[DEBUG] ${message}`));
  }
}

export function formatTable(data: any[], columns: string[]) {
  if (outputOptions.json) {
    console.log(JSON.stringify(data));
    return;
  }

  if (data.length === 0) {
    log('No data to display');
    return;
  }

  // Calculate column widths
  const widths = columns.map(col => {
    const maxWidth = Math.max(
      col.length,
      ...data.map(row => String(row[col] || '').length)
    );
    return Math.min(maxWidth, 50); // Cap at 50 characters
  });

  // Print header
  const header = columns.map((col, i) => 
    col.padEnd(widths[i])
  ).join('  ');
  console.log(colors.bold(header));
  console.log(colors.dim('─'.repeat(header.length)));

  // Print rows
  for (const row of data) {
    const rowStr = columns.map((col, i) => {
      const value = String(row[col] || '');
      return value.length > widths[i] 
        ? value.substring(0, widths[i] - 3) + '...'
        : value.padEnd(widths[i]);
    }).join('  ');
    console.log(rowStr);
  }
}

export function spinner(text: string): { stop: () => void } {
  if (outputOptions.json) {
    return { stop: () => {} };
  }

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let isSpinning = true;

  const interval = setInterval(() => {
    if (!isSpinning) return;
    process.stdout.write(`\r${colors.cyan(frames[i])} ${text}`);
    i = (i + 1) % frames.length;
  }, 100);

  return {
    stop: () => {
      isSpinning = false;
      clearInterval(interval);
      process.stdout.write('\r' + ' '.repeat(text.length + 2) + '\r');
    }
  };
}