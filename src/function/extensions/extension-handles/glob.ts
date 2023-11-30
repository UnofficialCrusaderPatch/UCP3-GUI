/* eslint-disable import/prefer-default-export */

const ILLEGAL_CHARACTERS = ['[', ']', '(', ')', '!'];

const globToRegExp = (glob: string) => {
  let regex = '';

  const chars = glob.split('');
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index];
    if (char === '*') {
      if (chars[index + 1] === '*') {
        regex += '[^/]*';
        index += 1;
      } else {
        regex += '[^/]*';
      }
    } else if (char === '.') {
      regex += '[.]';
    } else if (char === '/') {
      if (chars[index + 1] === '/') {
        regex += '/';
        index += 1;
      } else {
        regex += '/';
      }
    } else if (ILLEGAL_CHARACTERS.indexOf(char) !== -1) {
      throw Error(`Illegal regexp character in glob pattern: ${glob}`);
    } else {
      regex += char;
    }
  }

  return new RegExp(regex, 'g');
};

export { globToRegExp };
