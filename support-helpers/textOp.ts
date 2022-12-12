export function boolToText(
  booleanValue?: boolean,
  trueString: string = '',
  falseString: string = '',
  fallbackString: string = ''
): string {
  return booleanValue === true ? trueString : booleanValue === false ? falseString : fallbackString;
}

export function mapStrToText<TValue>(
  value: TValue,
  stringMapper: (stringValue: string) => string,
  fallbackMapper: (nonStringValue: Exclude<TValue, string>) => string
) {
  if (typeof value === 'string') {
    return stringMapper ? stringMapper(value) : value;
  } else {
    return fallbackMapper ? fallbackMapper(value as Exclude<TValue, string>) : String(value);
  }
}
