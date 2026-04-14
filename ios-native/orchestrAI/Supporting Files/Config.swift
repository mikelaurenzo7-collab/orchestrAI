import Foundation

// MARK: - Configuration
enum AppConfig {
    static let apiBaseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://api.orchestrai.app"
    static let appVersion = "1.0.0"
    static let buildNumber = "1"
    static let appStoreID = "com.orchestrai.app"
    
    // Rate limiting
    static let maxChatRequestsPerMinute = 30
    static let requestTimeout: TimeInterval = 30
    
    // UI Constants
    static let cornerRadius: CGFloat = 24
    static let smallCornerRadius: CGFloat = 16
    static let cardPadding: CGFloat = 20
    static let screenPadding: CGFloat = 24
}

// MARK: - Theme
enum Theme {
    // Colors
    static let emerald = "10B981" // #10B981
    static let accent = "F59E0B"   // #F59E0B
    static let blue = "3B82F6"     // #3B82F6
    static let error = "EF4444"    // #EF4444
    
    static let bgPrimary = "0A0A0A"       // #0A0A0A
    static let bgSecondary = "151515"     // #151515
    static let textPrimary = "FFFFFF"     // #FFFFFF
    static let textSecondary = "9CA3AF"   // #9CA3AF
    static let textDisabled = "4B5563"    // #4B5563
    
    // Fonts
    enum FontWeight {
        static let light = "Outfit-Light"
        static let regular = "Outfit-Regular"
        static let medium = "Outfit-Medium"
        static let semiBold = "Outfit-SemiBold"
        static let bold = "Outfit-Bold"
        
        static let bodyLight = "Manrope-Light"
        static let bodyRegular = "Manrope-Regular"
        static let bodyMedium = "Manrope-Medium"
        static let bodySemiBold = "Manrope-SemiBold"
        static let bodyBold = "Manrope-Bold"
    }
}

extension String {
    var hexColor: Color {
        var hexSanitized = self.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
}
