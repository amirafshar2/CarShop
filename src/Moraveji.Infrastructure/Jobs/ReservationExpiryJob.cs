using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moraveji.Application.Cars;

namespace Moraveji.Infrastructure.Jobs;

/// <summary>Every minute: expires reservations past their hold time and puts the cars back on sale.</summary>
public sealed class ReservationExpiryJob(IServiceScopeFactory scopes, ILogger<ReservationExpiryJob> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var cars = scope.ServiceProvider.GetRequiredService<ICarService>();
                var count = await cars.ExpireReservationsAsync(stoppingToken);
                if (count > 0) logger.LogInformation("Expired {Count} reservations", count);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Reservation expiry job failed");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
