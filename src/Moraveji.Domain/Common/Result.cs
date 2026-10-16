namespace Moraveji.Domain.Common;

public enum ErrorType
{
    Validation,
    NotFound,
    Conflict,
    Unauthorized,
    Forbidden,
    TooManyRequests,
    Failure
}

/// <param name="Code">Stable machine-readable code (e.g. "car.not_available").</param>
/// <param name="Message">Persian, user-facing message.</param>
public sealed record Error(string Code, string Message, ErrorType Type = ErrorType.Failure)
{
    public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);
    public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);
    public static Error Validation(string code, string message) => new(code, message, ErrorType.Validation);
    public static Error Unauthorized(string code, string message) => new(code, message, ErrorType.Unauthorized);
    public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
    public static Error TooMany(string code, string message) => new(code, message, ErrorType.TooManyRequests);
}

public class Result
{
    protected Result(bool isSuccess, Error? error)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error? Error { get; }

    public static Result Success() => new(true, null);
    public static Result Failure(Error error) => new(false, error);
    public static Result<T> Success<T>(T value) => Result<T>.Ok(value);
    public static Result<T> Failure<T>(Error error) => Result<T>.Fail(error);
}

public sealed class Result<T> : Result
{
    private readonly T? _value;

    private Result(T? value, bool isSuccess, Error? error) : base(isSuccess, error) => _value = value;

    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Cannot read the value of a failed result.");

    internal static Result<T> Ok(T value) => new(value, true, null);
    internal static Result<T> Fail(Error error) => new(default, false, error);

    public static implicit operator Result<T>(T value) => Ok(value);
    public static implicit operator Result<T>(Error error) => Fail(error);
}
