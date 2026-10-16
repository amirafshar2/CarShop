using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moraveji.Application.Cars;
using Moraveji.Application.Leads;

namespace Moraveji.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.Configure<ReservationOptions>(configuration.GetSection(ReservationOptions.Section));
        services.AddHybridCache();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<ICarService, CarService>();
        services.AddScoped<ILeadService, LeadService>();
        services.AddScoped<Catalog.IServiceCatalog, Catalog.ServiceCatalog>();
        return services;
    }
}
