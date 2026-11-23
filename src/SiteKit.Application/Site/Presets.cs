using SiteKit.Domain.Common;

namespace SiteKit.Application.Site;

public sealed record PresetInfo(string Key, string Title, string Description, string Icon);

public sealed record DemoListing(
    string Title, string? Category, string? Summary, string? Description, PriceType PriceType, long? Price, long? Original,
    string? Unit, string? Badge, string[] Images, Dictionary<string, string> Attributes, bool Featured = false);

public sealed record DemoService(
    string Title, string? Category, string? Description, string[] Features, PriceType PriceType, long? Price,
    string? Unit, string? Badge = null, bool Featured = false, long? Original = null);

/// <summary>
/// Starting points per kind of business. <see cref="Content"/> gives labels, fields, menu and suggested texts;
/// with <c>demo: true</c> it also fills a fictional brand so the site can be shown as a sample.
/// Demo photos: Unsplash License (see CREDITS.md).
/// </summary>
public static class Presets
{
    private const long E = 100; // 1 euro in cents (prices are stored as integer cents)
    private static string U(string id) => $"https://images.unsplash.com/photo-{id}?w=1600&q=80&auto=format&fit=crop";

    public static readonly IReadOnlyList<PresetInfo> All =
    [
        new("car", "Autohaus", "Fahrzeugbestand mit Baujahr, Kilometerstand, Getriebe und Kraftstoff", "car"),
        new("travel", "Reisebüro", "Reisen mit Ziel, Dauer, Abreisedatum und Hotel", "plane"),
        new("shop", "Shop", "Produkte mit Marke, Farbe und Größe", "bag"),
        new("services", "Dienstleistung / Salon / Praxis", "Arbeitsbeispiele und Leistungen mit Preisen und Terminbuchung", "sparkles"),
    ];

    public static bool Exists(string key) => All.Any(p => p.Key == key);

    public static SiteContent Content(string key, bool demo)
    {
        var c = key switch
        {
            "car" => Car(demo),
            "travel" => Travel(demo),
            "shop" => Shop(demo),
            _ => Services(demo),
        };
        c.Nav =
        [
            new() { Label = "Start", Href = "/" },
            new() { Label = c.Labels.ItemPlural, Href = "/items" },
            new() { Label = "Leistungen", Href = "/services" },
            new() { Label = "Kontakt", Href = "/contact" },
        ];
        c.Home.HeroCtaText ??= $"Alle {c.Labels.ItemPlural}";
        c.Home.HeroCtaUrl ??= "/items";
        c.Home.FeaturedTitle ??= $"{c.Labels.ItemPlural} – Highlights";
        c.Home.CtaTitle ??= "Noch Fragen?";
        c.Home.CtaText ??= "Melden Sie sich bei uns – wir antworten so schnell wie möglich.";
        c.Home.HighlightsEyebrow ??= c.Brand.Name;
        c.Home.FeaturedEyebrow ??= c.Labels.ItemPlural;
        c.Home.ServicesEyebrow ??= "Unsere Leistungen";
        c.Home.ServicesTitle ??= c.Labels.ServicesTitle;
        c.Home.TestimonialsEyebrow ??= "Kundenstimmen";
        c.Home.TestimonialsTitle ??= "Das sagen unsere Kunden";
        c.Home.GalleryTitle ??= c.Brand.Name;
        if (demo)
        {
            // Photos of the sample items give the steps (scroll story) and the zoom gallery something to show.
            var photos = DemoListings(key).SelectMany(l => l.Images).Prepend(c.Home.AboutImageUrl).Prepend(c.Home.HeroImageUrl)
                .Where(u => !string.IsNullOrEmpty(u)).Distinct().ToList();
            for (var i = 0; i < c.Home.Highlights.Count && photos.Count > 0; i++)
                c.Home.Highlights[i].ImageUrl ??= photos[(i + 1) % photos.Count];
            if (c.Home.Gallery.Count == 0) c.Home.Gallery = photos.Take(7).ToList()!;
            // Clearly marked samples — replaced by real reviews from the panel.
            if (c.Home.Testimonials.Count == 0)
            {
                c.Home.TestimonialsText = "(Beispieltext – ersetzen Sie die Stimmen im Admin-Panel durch echte Kundenmeinungen)";
                c.Home.Testimonials =
                [
                    new() { Name = "Beispieltext", Role = c.Labels.ItemSingular, Text = "„Hier erscheint die echte Meinung eines Kunden nach dem Kauf.“" },
                    new() { Name = "Beispieltext", Role = "Leistungen", Text = "„Veröffentlichen Sie nur Meinungen, für die der Kunde zugestimmt hat.“" },
                    new() { Name = "Beispieltext", Role = "Support", Text = "„Name, Kurzbeschreibung und Text ändern Sie im Admin-Panel unter Startseite.“" },
                    new() { Name = "Beispieltext", Role = c.Labels.ItemPlural, Text = "„Die Spalten laufen automatisch und halten an, wenn man mit der Maus darüberfährt.“" },
                    new() { Name = "Beispieltext", Role = "Kontakt", Text = "„Sie können bis zu 20 Stimmen hinzufügen.“" },
                    new() { Name = "Beispieltext", Role = "Zufriedenheit", Text = "„Diese Texte sind Beispiele und werden auf Ihrer Website ersetzt.“" },
                ];
            }
        }
        if (!demo)
        {
            c.Home.Testimonials = [];
            c.Home.Partners = [];
            c.Home.Gallery = [];
            c.Home.GalleryTitle = null;
            c.Home.HighlightsEyebrow = null;
            c.Brand = new BrandInfo();
            c.Contact = new ContactInfo();
            c.Home.Stats = [];
            c.Home.Faq = [];
            c.Home.AboutText = null;
            c.Footer = new FooterInfo();
        }
        return c;
    }

    // ---------------------------------------------------------------- car
    private static SiteContent Car(bool demo) => new()
    {
        Brand = new() { Name = "Autohaus Muster", Tagline = "Von der Auswahl bis zur Übergabe an Ihrer Seite", Description = "Neu- und Gebrauchtwagen mit Prüfung und transparenten Preisen." },
        Theme = new() { Primary = "#f97316", Mode = "dark" },
        Labels = new() { ItemSingular = "Fahrzeug", ItemPlural = "Fahrzeuge", ItemsPageTitle = "Fahrzeugbestand", RequestButton = "Besichtigung anfragen", CategoryLabel = "Typ", SoldOutLabel = "Verkauft" },
        Fields =
        [
            new() { Key = "year", Label = "Baujahr", Type = "number", ShowOnCard = true },
            new() { Key = "km", Label = "Kilometerstand", Type = "number", Suffix = "km", ShowOnCard = true },
            new() { Key = "gearbox", Label = "Getriebe", Type = "select", Options = ["Automatik", "Schaltgetriebe"], Filter = true },
            new() { Key = "fuel", Label = "Kraftstoff", Type = "select", Options = ["Benzin", "Hybrid", "Elektro", "Diesel"], Filter = true },
            new() { Key = "color", Label = "Farbe", Type = "text" },
        ],
        Categories = ["Neuwagen", "Gebrauchtwagen", "Vorführwagen"],
        Home = new()
        {
            HeroTitle = "Ihr nächstes Auto wartet hier",
            HeroSubtitle = "Aktueller Bestand, transparente Prüfung und Begleitung bis zur Übergabe.",
            HeroImageUrl = U("1503376780353-7e6692767b70"),
            HighlightsTitle = "Warum wir?",
            Highlights =
            [
                new() { Title = "Vollständige Prüfung", Text = "Jedes Fahrzeug wird vor dem Verkauf geprüft.", Icon = "shield" },
                new() { Title = "Transparente Preise", Text = "Keine versteckten Kosten.", Icon = "check" },
                new() { Title = "Schnelle Übergabe", Text = "Zulassung und Papiere übernehmen wir.", Icon = "clock" },
            ],
            AboutTitle = "Über uns",
            AboutText = "Dies ist ein Beispieltext. Im Admin-Panel stellen Sie hier Ihr eigenes Unternehmen vor.",
            AboutImageUrl = U("1590362891991-f776e747a588"),
            Stats = [new() { Value = "500+", Label = "verkaufte Fahrzeuge" }, new() { Value = "10", Label = "Jahre Erfahrung" }],
            Faq =
            [
                new() { Question = "Kann ich das Fahrzeug vor dem Kauf prüfen lassen?", Answer = "Ja, jedes Fahrzeug wird vor der Übergabe geprüft." },
                new() { Question = "Kaufen Sie auch mein Auto?", Answer = "Ja, wir bewerten es kostenlos und machen Ihnen ein Angebot." },
            ],
        },
        Contact = new() { Phone = "0711 000000", Whatsapp = "4915100000000", Instagram = "sample.gallery", Address = "Musterstraße 1", Hours = "Mo–Fr 9–19 Uhr, Sa 10–16 Uhr" },
        Footer = new() { Text = "Dies ist eine Beispiel-Website; alle Texte und Preise dienen nur der Vorführung." },
    };

    // ---------------------------------------------------------------- travel
    private static SiteContent Travel(bool demo) => new()
    {
        Brand = new() { Name = "Reisebüro Himmelblau", Tagline = "Sorglos reisen – von der Buchung bis zur Rückkehr", Description = "Reisen im In- und Ausland, Flüge und Hotels mit Rund-um-die-Uhr-Service." },
        Theme = new() { Primary = "#0ea5e9", Mode = "light" },
        Labels = new() { ItemSingular = "Reise", ItemPlural = "Reisen", ItemsPageTitle = "Alle Reisen", RequestButton = "Reise buchen", CategoryLabel = "Reiseart", SoldOutLabel = "Ausgebucht" },
        Fields =
        [
            new() { Key = "destination", Label = "Ziel", Type = "text", ShowOnCard = true },
            new() { Key = "duration", Label = "Dauer", Type = "text", ShowOnCard = true },
            new() { Key = "departure", Label = "Abreise", Type = "text" },
            new() { Key = "hotel", Label = "Hotel", Type = "select", Options = ["3 Sterne", "4 Sterne", "5 Sterne"], Filter = true },
            new() { Key = "transport", Label = "Anreise", Type = "select", Options = ["Flug", "Bus/Bahn", "Schiff"], Filter = true },
        ],
        Categories = ["Fernreise", "Deutschland", "Last Minute"],
        Home = new()
        {
            HeroTitle = "Wählen Sie hier Ihre nächste Reise",
            HeroSubtitle = "Ausgewählte Reisen zum besten Preis und mit Betreuung während der ganzen Reise.",
            HeroImageUrl = U("1507525428034-b723cf961d3e"),
            HighlightsTitle = "Reisen Sie mit uns",
            Highlights =
            [
                new() { Title = "Rund-um-die-Uhr-Service", Text = "Während der Reise sind wir immer für Sie da.", Icon = "phone" },
                new() { Title = "Bester Preis", Text = "Direkte Preise von Hotels und Airlines.", Icon = "star" },
                new() { Title = "Visum und Versicherung", Text = "Alle Reiseformalitäten übernehmen wir.", Icon = "map" },
            ],
            AboutTitle = "Über uns",
            AboutText = "Dies ist ein Beispieltext. Im Admin-Panel stellen Sie hier Ihr eigenes Reisebüro vor.",
            AboutImageUrl = U("1535262412227-85541e910204"),
            Stats = [new() { Value = "2000+", Label = "zufriedene Reisende" }, new() { Value = "30", Label = "Ziel" }],
            Faq =
            [
                new() { Question = "Welche Unterlagen brauche ich für die Buchung?", Answer = "Für Fernreisen einen Reisepass, der noch mindestens 6 Monate gültig ist." },
                new() { Question = "Kann ich in Raten zahlen?", Answer = "Bei einigen Reisen ja – sprechen Sie uns an." },
            ],
        },
        Contact = new() { Phone = "0711 000000", Whatsapp = "4915100000000", Instagram = "sample.travel", Address = "Musterstraße 2", Hours = "Täglich 9–21 Uhr" },
        Footer = new() { Text = "Dies ist eine Beispiel-Website; alle Reisen und Preise dienen nur der Vorführung." },
    };

    // ---------------------------------------------------------------- shop
    private static SiteContent Shop(bool demo) => new()
    {
        Brand = new() { Name = "Musterladen", Tagline = "Gute Auswahl, faire Preise", Description = "Originale Schuhe, Uhren und Kosmetik mit Garantie." },
        Theme = new() { Primary = "#e11d48", Mode = "light" },
        Labels = new() { ItemSingular = "Produkt", ItemPlural = "Produkte", ItemsPageTitle = "Alle Produkte", RequestButton = "Bestellen", CategoryLabel = "Kategorie", SoldOutLabel = "Nicht verfügbar" },
        Fields =
        [
            new() { Key = "brand", Label = "Marke", Type = "text", ShowOnCard = true },
            new() { Key = "size", Label = "Größe", Type = "text" },
            new() { Key = "color", Label = "Farbe", Type = "text" },
            new() { Key = "warranty", Label = "Garantie", Type = "select", Options = ["ja", "nein"], Filter = true },
        ],
        Categories = ["Schuhe", "Uhren", "Kosmetik"],
        Home = new()
        {
            HeroTitle = "Die Neuheiten sind da",
            HeroSubtitle = "Originalprodukte mit schnellem Versand in ganz Deutschland.",
            HeroImageUrl = U("1560769629-975ec94e6a86"),
            HighlightsTitle = "Sicher einkaufen",
            Highlights =
            [
                new() { Title = "Echtheitsgarantie", Text = "Alle Artikel sind Originale.", Icon = "shield" },
                new() { Title = "Schneller Versand", Text = "Versand in ganz Deutschland.", Icon = "truck" },
                new() { Title = "Einfache Rückgabe", Text = "Rückgabe innerhalb von 14 Tagen.", Icon = "gift" },
            ],
            AboutTitle = "Über uns",
            AboutText = "Dies ist ein Beispieltext. Im Admin-Panel stellen Sie hier Ihren eigenen Shop vor.",
            AboutImageUrl = U("1611930022073-b7a4ba5fcccd"),
            Stats = [new() { Value = "1000+", Label = "erfolgreiche Bestellungen" }],
            Faq =
            [
                new() { Question = "Wie lange dauert der Versand?", Answer = "Meist 2 bis 4 Werktage." },
                new() { Question = "Kann ich die Größe umtauschen?", Answer = "Ja, innerhalb von 14 Tagen nach Erhalt." },
            ],
        },
        Contact = new() { Phone = "0711 000000", Whatsapp = "4915100000000", Instagram = "sample.shop", Address = "Musterstraße 3", Hours = "Mo–Sa 10–20 Uhr" },
        Footer = new() { Text = "Dies ist eine Beispiel-Website; alle Produkte und Preise dienen nur der Vorführung." },
    };

    // ---------------------------------------------------------------- services
    private static SiteContent Services(bool demo) => new()
    {
        Brand = new() { Name = "Beauty-Salon Rosa", Tagline = "Schönheit mit Ruhe und Sorgfalt", Description = "Haare, Haut und Nägel – von erfahrenen Fachleuten." },
        Theme = new() { Primary = "#a855f7", Mode = "dark" },
        Labels = new() { ItemSingular = "Arbeitsbeispiel", ItemPlural = "Arbeitsbeispiele", ItemsPageTitle = "Unsere Arbeiten", RequestButton = "Termin buchen", CategoryLabel = "Kategorie", SoldOutLabel = "Nicht verfügbar" },
        Fields =
        [
            new() { Key = "duration", Label = "Dauer", Type = "text", ShowOnCard = true },
            new() { Key = "specialist", Label = "Fachkraft", Type = "text" },
        ],
        Categories = ["Haare", "Haut", "Nägel"],
        Home = new()
        {
            HeroTitle = "Ihre Schönheit in guten Händen",
            HeroSubtitle = "Online-Termine, ruhige Atmosphäre und erfahrene Fachleute.",
            HeroImageUrl = U("1633681926022-84c23e8cb2d6"),
            HighlightsTitle = "Warum wir?",
            Highlights =
            [
                new() { Title = "Erfahrene Fachleute", Text = "Viele Jahre Berufserfahrung.", Icon = "star" },
                new() { Title = "Hochwertige Produkte", Text = "Nur bewährte Marken.", Icon = "sparkles" },
                new() { Title = "Schnelle Termine", Text = "Online buchen ohne Wartezeit.", Icon = "clock" },
            ],
            AboutTitle = "Über uns",
            AboutText = "Dies ist ein Beispieltext. Im Admin-Panel stellen Sie hier Ihr eigenes Unternehmen vor.",
            AboutImageUrl = U("1580618672591-eb180b1a973f"),
            Stats = [new() { Value = "3000+", Label = "Kundinnen und Kunden" }, new() { Value = "8", Label = "Fachkraft" }],
            Faq =
            [
                new() { Question = "Wie bekomme ich einen Termin?", Answer = "Über den Button „Termin buchen“ oder telefonisch." },
                new() { Question = "Kostet eine Absage etwas?", Answer = "Bis 24 Stunden vorher ist sie kostenlos." },
            ],
        },
        Contact = new() { Phone = "0711 000000", Whatsapp = "4915100000000", Instagram = "sample.salon", Address = "Musterstraße 4", Hours = "Di–Sa 10–19 Uhr" },
        Footer = new() { Text = "Dies ist eine Beispiel-Website; alle Leistungen und Preise dienen nur der Vorführung." },
    };

    // ---------------------------------------------------------------- demo data
    public static IReadOnlyList<DemoListing> DemoListings(string key) => key switch
    {
        "car" =>
        [
            new("Toyota Camry Hybrid", "Neuwagen", "Neuwagen, Vollausstattung", "Beispielfahrzeug zur Vorführung. Daten und Preis ändern Sie im Admin-Panel.", PriceType.Fixed, 39_900 * E, null, null, "Sofort verfügbar",
                [U("1621007947382-bb3c3994e3fb")], new() { ["year"] = "2025", ["km"] = "0", ["gearbox"] = "Automatik", ["fuel"] = "Hybrid", ["color"] = "Weiß" }, true),
            new("BMW 5er", "Gebrauchtwagen", "Unfallfrei, 1. Hand", null, PriceType.Fixed, 28_500 * E, 31_900 * E, null, null,
                [U("1555215695-3004980ad54e")], new() { ["year"] = "2014", ["km"] = "98000", ["gearbox"] = "Automatik", ["fuel"] = "Benzin", ["color"] = "Weiß" }, true),
            new("Toyota RAV4", "Neuwagen", "Allradantrieb", null, PriceType.OnCall, null, null, null, null,
                [U("1617469767053-d3b523a0b982")], new() { ["year"] = "2025", ["km"] = "0", ["gearbox"] = "Automatik", ["fuel"] = "Benzin" }, true),
            new("Audi Q5", "Neuwagen", "Vollausstattung", null, PriceType.OnCall, null, null, null, null,
                [U("1606664515524-ed2f786a0bd6")], new() { ["year"] = "2024", ["km"] = "0", ["gearbox"] = "Automatik", ["fuel"] = "Benzin" }),
            new("Mercedes-AMG GT", "Gebrauchtwagen", "Wenig Kilometer", null, PriceType.From, 89_000 * E, null, null, "Highlight",
                [U("1618843479313-40f8afb4b4d8")], new() { ["year"] = "2019", ["km"] = "21000", ["gearbox"] = "Automatik", ["fuel"] = "Benzin" }),
            new("Kompakter Stadtflitzer", "Gebrauchtwagen", "Sparsam und gepflegt", null, PriceType.Fixed, 8_900 * E, null, null, null,
                [U("1550355291-bbee04a92027")], new() { ["year"] = "2020", ["km"] = "45000", ["gearbox"] = "Schaltgetriebe", ["fuel"] = "Benzin" }),
        ],
        "travel" =>
        [
            new("Städtereise Istanbul", "Fernreise", "4 Nächte / 5 Tage, Direktflug", "Beispielreise zur Vorführung. Programm, Hotel und Preis ändern Sie im Admin-Panel.", PriceType.From, 649 * E, 749 * E, "pro Person", "Bestseller",
                [U("1524231757912-21f4fe3a7200"), U("1589561454226-796a8aa89b05")], new() { ["destination"] = "Istanbul", ["duration"] = "4 Nächte", ["departure"] = "jeden Donnerstag", ["hotel"] = "4 Sterne", ["transport"] = "Flug" }, true),
            new("Dubai-Reise", "Fernreise", "5 Nächte, Frühstück und Transfer", null, PriceType.From, 1_190 * E, null, "pro Person", null,
                [U("1512453979798-5ea266f8880c"), U("1518684079-3c830dcef090")], new() { ["destination"] = "Dubai", ["duration"] = "5 Nächte", ["hotel"] = "5 Sterne", ["transport"] = "Flug" }, true),
            new("Tropische Inselreise", "Last Minute", "Nur wenige Plätze", null, PriceType.Fixed, 1_490 * E, 1_790 * E, "pro Person", "Last Minute",
                [U("1603477849227-705c424d1d80")], new() { ["destination"] = "Insel", ["duration"] = "3 Nächte", ["hotel"] = "4 Sterne", ["transport"] = "Flug" }, true),
            new("Ostsee-Kurzurlaub", "Deutschland", "3 Nächte direkt am Meer", null, PriceType.From, 299 * E, null, "pro Person", null,
                [U("1535262412227-85541e910204")], new() { ["destination"] = "Ostsee", ["duration"] = "3 Nächte", ["hotel"] = "3 Sterne", ["transport"] = "Bus/Bahn" }),
        ],
        "shop" =>
        [
            new("Roter Sportschuh", "Schuhe", "Leicht und bequem zum Gehen", "Beispielprodukt zur Vorführung. Daten und Preis ändern Sie im Admin-Panel.", PriceType.Fixed, 79 * E, 99 * E, null, "Rabatt",
                [U("1542291026-7eec264c27ff")], new() { ["brand"] = "Beispiel", ["size"] = "40 bis 45", ["color"] = "Rot", ["warranty"] = "ja" }, true),
            new("Smartwatch", "Uhren", "Wasserdicht, 2 Tage Akkulaufzeit", null, PriceType.Fixed, 199 * E, null, null, "Neu",
                [U("1546868871-7041f2a55e12")], new() { ["brand"] = "Beispiel", ["color"] = "Grau", ["warranty"] = "ja" }, true),
            new("Damenparfum", "Kosmetik", "100 ml", null, PriceType.Fixed, 69 * E, null, null, null,
                [U("1563170351-be82bc888aa4")], new() { ["brand"] = "Beispiel", ["warranty"] = "nein" }, true),
            new("Laufschuh", "Schuhe", "Ideal zum Joggen", null, PriceType.Fixed, 119 * E, null, null, null,
                [U("1491553895911-0055eca6402d")], new() { ["brand"] = "Beispiel", ["size"] = "38 bis 44", ["color"] = "Grau", ["warranty"] = "ja" }),
            new("Hautpflege-Set", "Kosmetik", "Drei Produkte", null, PriceType.From, 39 * E, null, null, null,
                [U("1629198688000-71f23e745b6e")], new() { ["brand"] = "Beispiel", ["warranty"] = "nein" }),
        ],
        _ =>
        [
            new("Haarschnitt und Styling", "Haare", "Frisur nach Ihrem Wunsch", "Arbeitsbeispiel zur Vorführung. Fotos Ihrer eigenen Arbeiten fügen Sie im Admin-Panel ein.", PriceType.From, 45 * E, null, null, null,
                [U("1634449571010-02389ed0f9b0")], new() { ["duration"] = "1 Stunde", ["specialist"] = "Beispiel-Fachkraft" }, true),
            new("Föhnen und Brushing", "Haare", null, null, PriceType.From, 25 * E, null, null, null,
                [U("1580618672591-eb180b1a973f")], new() { ["duration"] = "45 Minuten" }, true),
            new("Gesichtsreinigung", "Haut", "Für jeden Hauttyp", null, PriceType.Fixed, 69 * E, null, null, "Beliebt",
                [U("1616394584738-fc6e612e71b9")], new() { ["duration"] = "90 Minuten" }, true),
        ],
    };

    public static IReadOnlyList<DemoService> DemoServices(string key) => key switch
    {
        "car" =>
        [
            new("Fahrzeuggutachten", "Kaufberatung", "Prüfung von Karosserie, Lack, Motor und Getriebe mit schriftlichem Bericht.", ["Lack- und Karosserieprüfung", "Motor- und Getriebetest"], PriceType.Fixed, 149 * E, "pro Fahrzeug", null, true),
            new("Verkauf Ihres Fahrzeugs", "Kaufberatung", "Bewertung, Fotos und Käufersuche.", ["Professionelle Bewertung", "Professionelle Fotos"], PriceType.OnCall, null, null, "Ohne Provision"),
            new("Keramikversiegelung", "Fahrzeugaufbereitung", "Glänzender, langlebiger Lackschutz.", ["Politur", "Zwei Schichten Keramik"], PriceType.From, 399 * E, "pro Fahrzeug"),
        ],
        "travel" =>
        [
            new("Flugbuchung", "Flüge und Hotels", "Flüge im In- und Ausland.", ["Preisvergleich", "Sofortige Ausstellung"], PriceType.OnCall, null, null, null, true),
            new("Hotelbuchung", "Flüge und Hotels", "Hotels an allen Reisezielen.", ["Sofortige Bestätigung", "Flexible Stornierung"], PriceType.OnCall, null, null),
            new("Visum-Service", "Visum", "Beratung und Erledigung aller Visa-Schritte.", ["Prüfung der Unterlagen", "Botschaftstermin"], PriceType.From, 79 * E, "pro Person"),
        ],
        "shop" =>
        [
            new("Schneller Versand", "Versand", "Lieferung am selben Tag in der Stadt.", ["Sichere Verpackung"], PriceType.Fixed, 9 * E, "pro Bestellung"),
            new("Geschenkverpackung", "Sonderleistungen", "Als Geschenk mit Grußkarte.", ["Handgeschriebene Grußkarte"], PriceType.Fixed, 4 * E, "pro Produkt"),
        ],
        _ =>
        [
            new("Haarschnitt", "Haare", "Beratung und Schnitt nach Wunsch.", ["Waschen", "Föhnen"], PriceType.From, 39 * E, null, "Beliebt", true),
            new("Haarfarbe", "Haare", "Farbe und Strähnen mit bewährten Marken.", ["Verträglichkeitstest", "Farbberatung"], PriceType.From, 79 * E, null),
            new("Gesichtsreinigung", "Haut", "Tiefenreinigung und Maske.", ["Hautanalyse", "Spezialmaske"], PriceType.Fixed, 69 * E, "pro Sitzung", null, false, 85 * E),
            new("Maniküre", "Nägel", "Maniküre und Gel-Lack.", ["Formen", "Gel-Lack"], PriceType.Fixed, 35 * E, null),
        ],
    };
}
