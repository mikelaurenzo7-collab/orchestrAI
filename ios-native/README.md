# orchestrAI - Native iOS App

> **Premium Native SwiftUI Implementation**  
> The most stunning, immaculate iOS app for autonomous AI workforce management.

## 🎯 Overview

orchestrAI iOS is a native SwiftUI application that provides an Apple Design Award-worthy experience for managing your autonomous AI workforce. Built from the ground up with Swift and SwiftUI, this app leverages the full power of iOS 17+ to deliver buttery-smooth 60fps animations, native haptics, and Material Design depth.

## ✨ Features

### Core Screens
- **✅ Authentication** - Floating orb animations with native blur and spring physics
- **✅ Dashboard (HQ)** - Real-time metrics, trial banners, and activity feed
- **✅ Agent Hub** - Grid of specialized AI employees with live status indicators
- **✅ Chat Interface** - iMessage-grade messaging with typing indicators
- **✅ Integrations** - Connect Shopify, Stripe, and custom APIs
- **✅ Broadcast** - AI-generated social media campaigns with engagement metrics

### Native iOS Features
- **Materials & Blur** - Native `UIVisualEffectView` implementation via `.ultraThinMaterial`
- **Haptic Feedback** - Contextual sensory feedback on every interaction (`.selection`, `.impact`, `.success`)
- **Spring Animations** - Physics-based animations using `.spring(response:dampingFraction:)`
- **SF Symbols** - Professional iconography throughout
- **Custom Typography** - Outfit (headers) and Manrope (body) via SwiftUI
- **Dark Mode First** - Sophisticated dark theme with emerald/amber accents
- **Keyboard Handling** - Smart `@FocusState` and `KeyboardAvoidingView` equivalents

## 🏗 Architecture

```
orchestrAI/
├── Models/
│   └── Models.swift              # Codable data models
├── Services/
│   ├── APIClient.swift            # Networking layer
│   └── AuthService.swift          # Authentication & Keychain
├── ViewModels/
│   └── ViewModels.swift           # @Observable ViewModels
├── Views/
│   ├── AuthView.swift             # Login/Register
│   ├── MainTabView.swift          # Tab container
│   ├── DashboardView.swift        # Mission Control HQ
│   ├── AgentsView.swift           # AI workforce grid
│   ├── ChatView.swift             # Agent messaging
│   ├── StoresView.swift           # Platform integrations
│   └── SocialView.swift           # Broadcast campaigns
├── Components/                    # Reusable UI components
├── Resources/                     # Assets, fonts, colors
└── Supporting Files/
    ├── Config.swift               # App configuration
    └── Info.plist                 # App metadata
```

## 🚀 Getting Started

### Requirements
- **Xcode 15.0+**
- **iOS 17.0+**
- **Swift 5.9+**
- **macOS Sonoma 14.0+**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mikelaurenzo7-collab/orchestrAI.git
   cd orchestrAI/ios-native
   ```

2. **Open in Xcode**
   ```bash
   open orchestrAI.xcodeproj
   ```
   Or simply double-click the `.xcodeproj` file in Finder.

3. **Configure environment**
   - Update `Config.swift` with your API base URL
   - Add your backend API endpoint in the environment variables

4. **Run on Simulator or Device**
   - Select your target device/simulator
   - Press `Cmd + R` to build and run

### Environment Configuration

Create a `.env` file or configure Xcode build settings:

```swift
API_BASE_URL=https://api.orchestrai.app
```

Update in `Config.swift`:
```swift
enum AppConfig {
    static let apiBaseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://api.orchestrai.app"
}
```

## 📱 App Store Submission

### Pre-Submission Checklist

- [x] Info.plist configured with all privacy descriptions
- [x] App icons in all required sizes (20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt)
- [x] Launch screen configured
- [x] Privacy policy URL added
- [x] Support URL configured
- [x] App uses HTTPS for all network requests
- [x] ITSAppUsesNonExemptEncryption set to `false` (or provide export compliance)
- [x] Version and build numbers incremented

### App Store Connect Configuration

1. **App Information**
   - **Name**: orchestrAI
   - **Subtitle**: Autonomous AI Workforce Platform
   - **Category**: Business / Productivity
   - **Age Rating**: 4+

2. **Privacy Policy**
   - Data collected: Email, usage analytics
   - Purpose: Authentication, service improvement
   - Third-party sharing: None

3. **App Review Information**
   - **Test Account**:
     - Email: `admin@orchestrai.app`
     - Password: `Orchestr2026!`
   - **Notes**: This app requires backend API access. Reviewers can use the test account to explore all features.

4. **Screenshots Required**
   - 6.7" Display (iPhone 15 Pro Max): 1290 x 2796
   - 6.5" Display: 1242 x 2688
   - 5.5" Display: 1242 x 2208
   - iPad Pro (12.9-inch): 2048 x 2732

### Build & Archive

```bash
# Build for App Store
xcodebuild -scheme orchestrAI \
  -configuration Release \
  -archivePath "./build/orchestrAI.xcarchive" \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath "./build/orchestrAI.xcarchive" \
  -exportPath "./build" \
  -exportOptionsPlist ExportOptions.plist
```

Or use Xcode:
1. Product → Archive
2. Distribute App → App Store Connect
3. Upload

## 🎨 Design System

### Colors
```swift
Theme.emerald.hexColor      // #10B981 - Primary brand
Theme.accent.hexColor       // #F59E0B - Secondary accent
Theme.blue.hexColor         // #3B82F6 - Info/Intelligence
Theme.error.hexColor        // #EF4444 - Errors/Alerts
Theme.bgPrimary.hexColor    // #0A0A0A - Background
Theme.textPrimary.hexColor  // #FFFFFF - Primary text
Theme.textSecondary.hexColor // #9CA3AF - Secondary text
```

### Typography
- **Headers**: Outfit (Light, Regular, Medium, SemiBold, Bold)
- **Body**: Manrope (Light, Regular, Medium, SemiBold, Bold)

### Spacing
- Screen padding: 24pt
- Card padding: 20pt
- Corner radius: 24pt (cards), 16pt (buttons), 12pt (small elements)

## 🔒 Security

- **Keychain**: JWT tokens stored securely in iOS Keychain
- **HTTPS Only**: All network requests use TLS 1.2+
- **Certificate Pinning**: (Optional) Implement for production
- **Biometric Auth**: (Future) Face ID / Touch ID support

## 📊 Analytics & Monitoring

- Native iOS analytics (optional)
- Crash reporting via Xcode Organizer
- Performance monitoring with Instruments

## 🧪 Testing

### Unit Tests
```bash
xcodebuild test -scheme orchestrAI -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### UI Tests
```bash
xcodebuild test -scheme orchestrAI -testPlan UITests
```

## 🚢 Deployment

### TestFlight Beta
1. Archive the app (Product → Archive)
2. Select "Distribute App" → "App Store Connect"
3. Select "Upload"
4. Add beta testers in App Store Connect

### Production Release
1. Increment version/build number
2. Archive and upload
3. Submit for App Review
4. Monitor status in App Store Connect

## 📝 Changelog

### Version 1.0.0 (Build 1)
- ✅ Initial native SwiftUI implementation
- ✅ Authentication with JWT & Keychain
- ✅ Dashboard with live metrics
- ✅ Agent Hub with grid layout
- ✅ Chat interface with typing indicators
- ✅ Store integrations management
- ✅ Social broadcast campaigns
- ✅ Native haptics and animations
- ✅ Material Design depth layers
- ✅ Dark mode optimized UI

## 🤝 Contributing

This is a private enterprise application. For internal development:

1. Create a feature branch
2. Implement changes with SwiftUI best practices
3. Test on physical devices (iPhone 15 Pro, iPad Pro)
4. Submit PR with screenshots

## 📄 License

Proprietary - All rights reserved © 2026 orchestrAI

## 🆘 Support

For technical support:
- Email: support@orchestrai.app
- Internal Slack: #ios-dev

---

**Built with ❤️ using Swift, SwiftUI, and native iOS frameworks**
