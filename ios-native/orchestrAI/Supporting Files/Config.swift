import SwiftUI

// MARK: - Configuration

enum AppConfig {
    static let apiBaseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://api.orchestrai.app"
    static let appVersion = "1.0.0"
    static let buildNumber = "1"
    static let bundleID = "com.orchestrai.app"
    
    static let maxChatRequestsPerMinute = 30
    static let requestTimeout: TimeInterval = 30
    
    static let cornerRadius: CGFloat = 24
    static let smallCornerRadius: CGFloat = 16
    static let tinyCornerRadius: CGFloat = 10
    static let cardPadding: CGFloat = 20
    static let screenPadding: CGFloat = 24
}

// MARK: - Design System

enum Theme {
    // Primary Palette
    static let emerald = "10B981"
    static let emeraldDark = "059669"
    static let emeraldLight = "34D399"
    
    // Secondary
    static let purple = "8B5CF6"
    static let purpleLight = "A78BFA"
    static let blue = "3B82F6"
    static let cyan = "06B6D4"
    
    // Semantic
    static let accent = "F59E0B"
    static let error = "EF4444"
    static let success = "22C55E"
    static let warning = "F97316"
    
    // Surfaces
    static let bgPrimary = "050505"
    static let bgSecondary = "0F0F0F"
    static let bgTertiary = "1A1A1A"
    static let bgElevated = "141414"
    
    // Text
    static let textPrimary = "FFFFFF"
    static let textSecondary = "9CA3AF"
    static let textTertiary = "6B7280"
    static let textDisabled = "374151"
    
    // Typography
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
    
    // Animation Presets
    enum Anim {
        static let snappy = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.7)
        static let smooth = SwiftUI.Animation.spring(response: 0.5, dampingFraction: 0.8)
        static let bouncy = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.55)
        static let gentle = SwiftUI.Animation.easeInOut(duration: 0.3)
    }
    
    // Gradients
    static var emeraldGradient: LinearGradient {
        LinearGradient(
            colors: [emerald.hexColor, emeraldDark.hexColor],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    static var purpleGradient: LinearGradient {
        LinearGradient(
            colors: [purple.hexColor, "6D28D9".hexColor],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - Hex Color Extension

extension String {
    var hexColor: Color {
        var hex = trimmingCharacters(in: .whitespacesAndNewlines)
        hex = hex.replacingOccurrences(of: "#", with: "")
        var rgb: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgb)
        return Color(
            red: Double((rgb & 0xFF0000) >> 16) / 255.0,
            green: Double((rgb & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgb & 0x0000FF) / 255.0
        )
    }
}
