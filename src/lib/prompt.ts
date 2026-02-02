import * as readline from 'readline';

export interface PromptOptions {
  required?: boolean;
  default?: string;
  choices?: string[];
  mask?: boolean; // For password-like inputs
}

export async function prompt(question: string, options: PromptOptions = {}): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const displayQuestion = formatQuestion(question, options);
    
    rl.question(displayQuestion, (answer) => {
      rl.close();
      
      const trimmedAnswer = answer.trim();
      
      // Use default if no answer provided
      if (!trimmedAnswer && options.default) {
        resolve(options.default);
        return;
      }
      
      // Validate required fields
      if (options.required && !trimmedAnswer) {
        console.log('This field is required.');
        resolve(prompt(question, options));
        return;
      }
      
      // Validate choices
      if (options.choices && trimmedAnswer && !options.choices.includes(trimmedAnswer)) {
        console.log(`Please choose one of: ${options.choices.join(', ')}`);
        resolve(prompt(question, options));
        return;
      }
      
      resolve(trimmedAnswer);
    });
  });
}

export async function confirm(question: string, defaultValue = false): Promise<boolean> {
  const defaultStr = defaultValue ? 'Y/n' : 'y/N';
  const answer = await prompt(`${question} (${defaultStr}):`, {
    default: defaultValue ? 'y' : 'n'
  });
  
  return ['y', 'yes', 'true', '1'].includes(answer.toLowerCase());
}

export async function promptPassword(question: string): Promise<string> {
  // Note: This is a simplified implementation
  // In a real CLI, you'd want to use a library like 'inquirer' for proper password masking
  return prompt(`${question} (input hidden):`, { required: true });
}

export async function promptList<T>(
  question: string,
  choices: { name: string; value: T }[],
  defaultIndex = 0
): Promise<T> {
  console.log(question);
  choices.forEach((choice, index) => {
    const marker = index === defaultIndex ? '→' : ' ';
    console.log(`${marker} ${index + 1}. ${choice.name}`);
  });
  
  const answer = await prompt('Select option (number):', {
    default: String(defaultIndex + 1),
    required: true
  });
  
  const selectedIndex = parseInt(answer) - 1;
  
  if (selectedIndex < 0 || selectedIndex >= choices.length) {
    console.log('Invalid selection.');
    return promptList(question, choices, defaultIndex);
  }
  
  return choices[selectedIndex].value;
}

export async function promptMultiline(question: string): Promise<string> {
  console.log(`${question} (press Enter twice to finish):`);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    const lines: string[] = [];
    let emptyLineCount = 0;
    
    rl.on('line', (line) => {
      if (line.trim() === '') {
        emptyLineCount++;
        if (emptyLineCount >= 2) {
          rl.close();
          resolve(lines.join('\n'));
          return;
        }
      } else {
        emptyLineCount = 0;
      }
      
      lines.push(line);
    });
  });
}

function formatQuestion(question: string, options: PromptOptions): string {
  let formattedQuestion = question;
  
  // Add choices if provided
  if (options.choices) {
    formattedQuestion += ` (${options.choices.join('/')})`;
  }
  
  // Add default value indicator
  if (options.default) {
    formattedQuestion += ` [${options.default}]`;
  }
  
  // Add required indicator
  if (options.required) {
    formattedQuestion += ' *';
  }
  
  // Ensure question ends with appropriate punctuation
  if (!formattedQuestion.endsWith(':') && !formattedQuestion.endsWith('?')) {
    formattedQuestion += ':';
  }
  
  return `${formattedQuestion} `;
}