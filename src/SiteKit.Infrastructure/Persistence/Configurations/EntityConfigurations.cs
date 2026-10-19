using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SiteKit.Domain.Audit;
using SiteKit.Domain.Catalog;
using SiteKit.Domain.Leads;
using SiteKit.Domain.Listings;
using SiteKit.Domain.Site;
using SiteKit.Infrastructure.Identity;

namespace SiteKit.Infrastructure.Persistence.Configurations;

public sealed class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> b)
    {
        b.ToTable("Listings");
        b.HasKey(x => x.Id);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Property(x => x.Title).HasMaxLength(150).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.Category).HasMaxLength(60);
        b.Property(x => x.Summary).HasMaxLength(200);
        b.Property(x => x.Description).HasMaxLength(5000);
        b.Property(x => x.Unit).HasMaxLength(40);
        b.Property(x => x.Badge).HasMaxLength(30);
        b.Property(x => x.Images).HasMaxLength(13000);
        b.Property(x => x.AttributesJson).HasMaxLength(4000);
        b.HasIndex(x => new { x.Status, x.SortOrder });
    }
}

public sealed class SiteSettingsConfiguration : IEntityTypeConfiguration<SiteSettings>
{
    public void Configure(EntityTypeBuilder<SiteSettings> b)
    {
        b.ToTable("SiteSettings");
        b.HasKey(x => x.Id);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Property(x => x.Preset).HasMaxLength(20).IsRequired();
        b.Property(x => x.ContentJson).IsRequired();
        b.Property(x => x.CompletedSteps).HasMaxLength(200);
    }
}

public sealed class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> b)
    {
        b.ToTable("Leads");
        b.HasKey(x => x.Id);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Property(x => x.Name).HasMaxLength(80).IsRequired();
        b.Property(x => x.Phone).HasMaxLength(11).IsRequired();
        b.Property(x => x.Message).HasMaxLength(1000);
        b.HasIndex(x => new { x.AssignedStaffId, x.Status });
        b.HasIndex(x => x.CreatedAt);
    }
}

public sealed class ServiceItemConfiguration : IEntityTypeConfiguration<ServiceItem>
{
    public void Configure(EntityTypeBuilder<ServiceItem> b)
    {
        b.ToTable("ServiceItems");
        b.HasKey(x => x.Id);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Property(x => x.Title).HasMaxLength(120).IsRequired();
        b.Property(x => x.Description).HasMaxLength(1000);
        b.Property(x => x.Features).HasMaxLength(2000);
        b.Property(x => x.Category).HasMaxLength(60);
        b.Property(x => x.Unit).HasMaxLength(40);
        b.Property(x => x.Badge).HasMaxLength(30);
        b.Property(x => x.ImageUrl).HasMaxLength(1000);
        b.HasIndex(x => new { x.IsActive, x.Category, x.SortOrder });
    }
}

public sealed class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> b)
    {
        b.ToTable("AuditLogs");
        b.HasKey(x => x.Id);
        b.Property(x => x.EntityName).HasMaxLength(60).IsRequired();
        b.Property(x => x.Action).HasMaxLength(20).IsRequired();
        b.HasIndex(x => new { x.EntityName, x.EntityId });
        b.HasIndex(x => x.At);
    }
}

public sealed class OtpCodeConfiguration : IEntityTypeConfiguration<OtpCode>
{
    public void Configure(EntityTypeBuilder<OtpCode> b)
    {
        b.ToTable("OtpCodes");
        b.HasKey(x => x.Id);
        b.Property(x => x.Phone).HasMaxLength(11).IsRequired();
        b.Property(x => x.CodeHash).HasMaxLength(128).IsRequired();
        b.Property(x => x.RequestIp).HasMaxLength(64);
        b.HasIndex(x => new { x.Phone, x.CreatedAt });
    }
}

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> b)
    {
        b.ToTable("RefreshTokens");
        b.HasKey(x => x.Id);
        b.Property(x => x.TokenHash).HasMaxLength(128).IsRequired();
        b.HasIndex(x => x.TokenHash).IsUnique();
        b.HasIndex(x => x.FamilyId);
        b.HasIndex(x => x.UserId);
    }
}

public sealed class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> b)
    {
        b.Property(x => x.FullName).HasMaxLength(80);
        b.HasIndex(x => x.PhoneNumber).IsUnique();
    }
}
