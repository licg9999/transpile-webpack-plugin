export function boolToText(
  booleanValue?: boolean,
  trueString: string = '',
  falseString: string = '',
  fallbackString: string = ''
): string {
  return booleanValue === true ? trueString : booleanValue === false ? falseString : fallbackString;
}
