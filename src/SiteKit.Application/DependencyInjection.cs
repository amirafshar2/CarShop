using FluentValidation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SiteKit.Application.Leads;
using SiteKit.Application.Listings;
using SiteKit.Application.Site;

namespace SiteKit.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddHybridCache();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IListingService, ListingService>();
        services.AddScoped<ISiteService, SiteService>();
        services.AddScoped<ILeadService, LeadService>();
        services.AddScoped<Catalog.IServiceCatalog, Catalog.ServiceCatalog>();
        return services;
    }
}
