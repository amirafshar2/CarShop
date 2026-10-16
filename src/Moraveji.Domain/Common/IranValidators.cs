using System.Text;

namespace Moraveji.Domain.Common;

public static class IranValidators
{
    /// <summary>Converts Persian/Arabic digits to ASCII digits.</summary>
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
    /// Normalises an Iranian mobile number to "09xxxxxxxxx".
    /// Accepts +98 / 0098 / 98 prefixes, Persian digits, spaces and dashes.
    /// </summary>
    public static bool TryNormalizeMobile(string? input, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(input)) return false;

        var digits = new string(NormalizeDigits(input).Where(char.IsAsciiDigit).ToArray());
        if (digits.StartsWith("0098")) digits = "0" + digits[4..];
        else if (digits.StartsWith("98") && digits.Length == 12) digits = "0" + digits[2..];
        else if (digits.Length == 10 && digits[0] == '9') digits = "0" + digits;

        if (digits.Length != 11 || !digits.StartsWith("09")) return false;
        normalized = digits;
        return true;
    }

    /// <summary>Validates an Iranian national code (کد ملی) with its check digit.</summary>
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
