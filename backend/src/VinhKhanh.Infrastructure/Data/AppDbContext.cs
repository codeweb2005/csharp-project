using Microsoft.EntityFrameworkCore;
using VinhKhanh.Domain.Entities;

namespace VinhKhanh.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Language> Languages => Set<Language>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<CategoryTranslation> CategoryTranslations => Set<CategoryTranslation>();
    public DbSet<POI> POIs => Set<POI>();
    public DbSet<POITranslation> POITranslations => Set<POITranslation>();
    public DbSet<POIMedia> POIMedia => Set<POIMedia>();
    public DbSet<AudioNarration> AudioNarrations => Set<AudioNarration>();
    public DbSet<POIMenuItem> MenuItems => Set<POIMenuItem>();
    public DbSet<MenuItemTranslation> MenuItemTranslations => Set<MenuItemTranslation>();
    public DbSet<VisitHistory> VisitHistory => Set<VisitHistory>();
    public DbSet<OfflinePackage> OfflinePackages => Set<OfflinePackage>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // Language
        mb.Entity<Language>(e =>
        {
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Code).HasMaxLength(10);
            e.Property(x => x.Name).HasMaxLength(50);
            e.Property(x => x.NativeName).HasMaxLength(50);
            e.Property(x => x.FlagEmoji).HasMaxLength(10);
        });

        // User
        mb.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.PasswordHash).HasMaxLength(512);
            e.Property(x => x.FullName).HasMaxLength(100);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.AvatarUrl).HasMaxLength(500);
            e.Property(x => x.RefreshToken).HasMaxLength(512);
            e.Property(x => x.PasswordResetTokenHash).HasMaxLength(64);
            e.HasOne(x => x.PreferredLanguage).WithMany().HasForeignKey(x => x.PreferredLanguageId);
        });

        // Category
        mb.Entity<Category>(e =>
        {
            e.Property(x => x.Icon).HasMaxLength(10);
            e.Property(x => x.Color).HasMaxLength(10);
        });

        mb.Entity<CategoryTranslation>(e =>
        {
            e.HasIndex(x => new { x.CategoryId, x.LanguageId }).IsUnique();
            e.Property(x => x.Name).HasMaxLength(100);
            e.HasOne(x => x.Category).WithMany(c => c.Translations).HasForeignKey(x => x.CategoryId);
            e.HasOne(x => x.Language).WithMany().HasForeignKey(x => x.LanguageId);
        });

        // POI
        mb.Entity<POI>(e =>
        {
            e.Property(x => x.Address).HasMaxLength(500);
            e.Property(x => x.Phone).HasMaxLength(20);
            e.Property(x => x.Website).HasMaxLength(500);
            e.Property(x => x.PriceRangeMin).HasColumnType("decimal(10,0)");
            e.Property(x => x.PriceRangeMax).HasColumnType("decimal(10,0)");
            e.HasIndex(x => x.CategoryId);
            e.HasIndex(x => x.IsActive);
            e.HasOne(x => x.Category).WithMany(c => c.POIs).HasForeignKey(x => x.CategoryId);
            e.HasOne(x => x.VendorUser).WithMany(u => u.VendorPOIs).HasForeignKey(x => x.VendorUserId);
            // VendorUserId must be a NON-UNIQUE index — one vendor can own many POIs (1:N).
            // Without this explicit call EF may generate or preserve a UNIQUE index from old 1:1 schema.
            e.HasIndex(x => x.VendorUserId).IsUnique(false);
        });

        mb.Entity<POITranslation>(e =>
        {
            e.HasIndex(x => new { x.POIId, x.LanguageId }).IsUnique();
            e.Property(x => x.Name).HasMaxLength(200);
            e.HasOne(x => x.POI).WithMany(p => p.Translations).HasForeignKey(x => x.POIId);
            e.HasOne(x => x.Language).WithMany().HasForeignKey(x => x.LanguageId);
        });

        // POIMedia
        mb.Entity<POIMedia>(e =>
        {
            e.Property(x => x.FilePath).HasMaxLength(500);
            e.Property(x => x.Caption).HasMaxLength(200);
            e.HasOne(x => x.POI).WithMany(p => p.Media).HasForeignKey(x => x.POIId);
        });

        // Audio
        mb.Entity<AudioNarration>(e =>
        {
            e.Property(x => x.FilePath).HasMaxLength(500);
            e.Property(x => x.VoiceName).HasMaxLength(100);
            e.HasIndex(x => new { x.POIId, x.LanguageId });
            e.HasOne(x => x.POI).WithMany(p => p.AudioNarrations).HasForeignKey(x => x.POIId);
            e.HasOne(x => x.Language).WithMany().HasForeignKey(x => x.LanguageId);
        });

        // Menu — table/column names match Database/002_CreateTables.sql (POIMenuItems, ImageUrl)
        mb.Entity<POIMenuItem>(e =>
        {
            e.ToTable("POIMenuItems");
            e.Property(x => x.Price).HasColumnType("decimal(10,0)");
            e.Property(x => x.ImagePath).HasColumnName("ImageUrl").HasMaxLength(500);
            e.HasOne(x => x.POI).WithMany(p => p.MenuItems).HasForeignKey(x => x.POIId);
        });

        mb.Entity<MenuItemTranslation>(e =>
        {
            e.HasIndex(x => new { x.MenuItemId, x.LanguageId }).IsUnique();
            e.Property(x => x.Name).HasMaxLength(200);
            e.HasOne(x => x.MenuItem).WithMany(m => m.Translations).HasForeignKey(x => x.MenuItemId);
            e.HasOne(x => x.Language).WithMany().HasForeignKey(x => x.LanguageId);
        });

        // Visit History
        mb.Entity<VisitHistory>(e =>
        {
            e.HasIndex(x => x.POIId);
            e.HasIndex(x => x.VisitedAt);
            e.HasIndex(x => new { x.POIId, x.VisitedAt });
            e.Property(x => x.DeviceId).HasMaxLength(100);
            e.HasOne(x => x.POI).WithMany(p => p.Visits).HasForeignKey(x => x.POIId);
            // UserId is nullable — SET NULL when the User account is deleted so analytics data is preserved.
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Language).WithMany().HasForeignKey(x => x.LanguageId);
        });

        // Offline Package
        mb.Entity<OfflinePackage>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Version).HasMaxLength(20);
            e.Property(x => x.FilePath).HasMaxLength(500);
            e.Property(x => x.Checksum).HasMaxLength(100);
            e.Property(x => x.CurrentStep).HasMaxLength(200);
            e.HasOne(x => x.Language).WithMany().HasForeignKey(x => x.LanguageId);
        });

        // System Settings
        mb.Entity<SystemSetting>(e =>
        {
            e.HasIndex(x => x.Key).IsUnique();
            e.Property(x => x.Key).HasMaxLength(100);
            e.Property(x => x.Value).HasMaxLength(1000);
            e.Property(x => x.Description).HasMaxLength(500);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(ct);
    }
}
