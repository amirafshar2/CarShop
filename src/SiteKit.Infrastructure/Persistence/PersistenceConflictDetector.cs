using Microsoft.Data.SqlClient;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SiteKit.Application.Abstractions;

namespace SiteKit.Infrastructure.Persistence;

public sealed class PersistenceConflictDetector : IPersistenceConflictDetector
{
    public bool IsConflict(Exception exception) => exception switch
    {
        DbUpdateConcurrencyException => true,
        DbUpdateException { InnerException: SqliteException { SqliteErrorCode: 19 } } => true, // SQLITE_CONSTRAINT
        DbUpdateException { InnerException: SqlException sql } when sql.Number is 2601 or 2627 => true, // unique violation
        _ => false
    };
}
