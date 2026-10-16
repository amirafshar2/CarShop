using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Moraveji.Domain.Audit;
using Moraveji.Domain.Cars;
using Moraveji.Domain.Catalog;
using Moraveji.Domain.Leads;
using Moraveji.Domain.Reservations;
using Moraveji.Infrastructure.Identity;

namespace Moraveji.Infrastructure.Persistence.Configurations;

public sealed class CarConfiguration : IEntityTypeConfiguration<Car>
{
    public void Configure(EntityTypeBuilder<Car> b)
    {
        b.ToTable("Cars");
        b.HasKey(x => x.Id);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.TitleFa).HasMaxLength(150).IsRequired();
        b.Property(x => x.BrandEn).HasMaxLength(60).IsRequired();
        b.Property(x => x.ModelEn).HasMaxLength(60).IsRequired();
        b.Property(x => x.Trim).HasMaxLength(80);
        b.Property(x => x.Package).HasMaxLength(80);
        b.Property(x => x.Colors).HasMaxLength(200);
        b.Property(x => x.OriginCountry).HasMaxLength(40);
        b.Property(x => x.Description).HasMaxLength(4000);
        b.Property(x => x.BodyCondition).HasMaxLength(500);
        b.Property(x => x.Vin).HasMaxLength(17);
        b.Property(x => x.FreeZone).HasMaxLength(80);

        // Indexes on the columns the inventory filters use.
        b.HasIndex(x => new { x.Status, x.ListingType, x.PublishedAt });
        b.HasIndex(x => new { x.BrandEn, x.ModelEn });
        b.HasIndex(x => x.ModelYear);
        b.HasIndex(x => x.PriceRial);

        b.HasMany(x => x.Images).WithOne().HasForeignKey(i => i.CarId).OnDelete(DeleteBehavior.Cascade);
        b.Navigation(x => x.Images).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public sealed class CarImageConfiguration : IEntityTypeConfiguration<CarImage>
{
    public void Configure(EntityTypeBuilder<CarImage> b)
    {
        b.ToTable("CarImages");
        b.HasKey(x => x.Id);
        b.Property(x => x.Url).HasMaxLength(1000).IsRequired();
        b.Property(x => x.Alt).HasMaxLength(200);
        b.HasIndex(x => x.CarId);
    }
}

public sealed class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> b)
    {
        b.ToTable("Reservations");
        b.HasKey(x => x.Id);
        b.Property(x => x.Version).IsConcurrencyToken();
        b.HasOne<Car>().WithMany().HasForeignKey(x => x.CarId).OnDelete(DeleteBehavior.Restrict);
        // One active reservation per customer: one account cannot hold the whole showroom.
        b.HasIndex(x => x.CustomerId)
            .IsUnique()
            .HasFilter($"Status = {(int)ReservationStatus.Active} AND IsDeleted = 0")
            .HasDatabaseName("UX_Reservations_OneActivePerCustomer");
        b.HasIndex(x => new { x.Status, x.ExpiresAt });

        // DATABASE-LEVEL GUARANTEE: a car can have at most ONE active reservation.
        // Even a bug in application code cannot sell the same car twice.
        // The filter is plain SQL that both SQL Server and SQLite accept.
        b.HasIndex(x => x.CarId)
            .IsUnique()
            .HasFilter($"Status = {(int)ReservationStatus.Active} AND IsDeleted = 0")
            .HasDatabaseName("UX_Reservations_OneActivePerCar");
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
