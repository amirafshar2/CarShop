using SiteKit.Domain.Common;

namespace SiteKit.Domain.Site;

/// <summary>
/// The single settings row of an installation: brand, texts, colours, menu … stored as one JSON document
/// so new options never need a schema change.
/// </summary>
public sealed class SiteSettings : Entity, IAudited
{
    private SiteSettings() { }

    public SiteSettings(string preset, string contentJson)
    {
        Preset = preset;
        ContentJson = contentJson;
    }

    /// <summary>car | travel | shop | services</summary>
    public string Preset { get; set; } = "services";
    public string ContentJson { get; set; } = "{}";
    /// <summary>Unpublished sites show a «coming soon» page to visitors; staff can still preview.</summary>
    public bool IsPublished { get; set; }
    /// <summary>False until the owner has finished the first-run assistant.</summary>
    public bool SetupCompleted { get; set; }
    /// <summary>Wizard steps the owner has finished (comma separated).</summary>
    public string? CompletedSteps { get; set; }
}
