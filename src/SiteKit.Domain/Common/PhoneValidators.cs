using System.Text;

namespace SiteKit.Domain.Common;

public static class PhoneValidators
{
    /// <summary>Converts Persian/Arabic digits to ASCII digits (harmless for German input).</summary>
    public static string NormalizeDigits(string input)
    {
        var sb = new StringBuilder(input.Length);
        foreach (var c in input)
        {
            sb.Append(c switch
            {
                >= '۰' and <= '۹' => (char)('0' + (c - '۰')),
                >= '٠' and <= '٩' => (char)('0' + (c - '٠')),
                _ => c
            });
        }
        return sb.ToString();
    }

    /// <summary>
    /// Normalises a German mobile number to "01xxxxxxxxx" (e.g. 015112345678).
    /// Accepts +49 / 0049 / 49 prefixes, spaces, dashes and slashes.
    /// </summary>
    public static bool TryNormalizeMobile(string? input, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(input)) return false;

        var digits = new string(NormalizeDigits(input).Where(char.IsAsciiDigit).ToArray());
        if (digits.StartsWith("0049")) digits = "0" + digits[4..];
        else if (digits.StartsWith("49") && digits.Length >= 12) digits = "0" + digits[2..];
        else if (digits.Length is 10 or 11 && digits[0] == '1') digits = "0" + digits;

        // German mobile prefixes: 015x, 016x, 017x; 11 or 12 digits in total
        if (digits.Length is < 11 or > 12 || !digits.StartsWith("01") || digits[2] is < '5' or > '7') return false;
        normalized = digits;
        return true;
    }

    /// <summary>Validates an Iranian national code with its check digit (kept from the original version, not used in the German UI).</summary>
    public static bool IsValidNationalCode(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return false;
        var code = NormalizeDigits(input.Trim());
        if (code.Length != 10 || !code.All(char.IsAsciiDigit)) return false;
        if (code.Distinct().Count() == 1) return false; // 0000000000, 1111111111, ...

        var sum = 0;
        for (var i = 0; i < 9; i++) sum += (code[i] - '0') * (10 - i);
        var remainder = sum % 11;
        var check = code[9] - '0';
        return remainder < 2 ? check == remainder : check == 11 - remainder;
    }
}
