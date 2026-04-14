import SwiftUI

struct StoresView: View {
    @State private var viewModel = StoresViewModel()
    @State private var showAddStore = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Integrations")
                                    .font(.custom(Theme.FontWeight.bold, size: 34))
                                    .foregroundStyle(.white)
                                
                                Text(viewModel.stores.isEmpty
                                     ? "Connect your business platforms"
                                     : "\(viewModel.activeStores) active • $\(formatRevenue(viewModel.totalRevenue)) tracked")
                                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                            }
                            
                            Spacer()
                            
                            Button {
                                showAddStore = true
                            } label: {
                                ZStack {
                                    Circle()
                                        .fill(Theme.emeraldGradient)
                                        .frame(width: 46, height: 46)
                                        .shadow(color: Theme.emerald.hexColor.opacity(0.3), radius: 10, y: 4)
                                    
                                    Image(systemName: "plus")
                                        .font(.system(size: 20, weight: .bold))
                                        .foregroundStyle(.white)
                                }
                            }
                            .buttonStyle(ScaleButtonStyle())
                            .sensoryFeedback(.impact(weight: .medium), trigger: showAddStore)
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                        
                        // Stores List
                        if viewModel.stores.isEmpty && !viewModel.isLoading {
                            EmptyStoresView()
                        } else {
                            VStack(spacing: 16) {
                                ForEach(Array(viewModel.stores.enumerated()), id: \.element.id) { index, store in
                                    StoreCard(store: store)
                                        .staggered(index: index)
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        
                        Spacer().frame(height: 100)
                    }
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await viewModel.fetchStores()
                }
                
                if viewModel.isLoading && viewModel.stores.isEmpty {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Theme.emerald.hexColor)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showAddStore) {
                AddStoreSheet(viewModel: viewModel)
            }
        }
        .task {
            if viewModel.stores.isEmpty {
                await viewModel.fetchStores()
            }
        }
    }
    
    private func formatRevenue(_ value: Double) -> String {
        if value >= 1_000_000 { return String(format: "%.1fM", value / 1_000_000) }
        if value >= 1_000 { return String(format: "%.1fK", value / 1_000) }
        return String(format: "%.0f", value)
    }
}

// MARK: - Store Card

struct StoreCard: View {
    let store: Store
    
    private var platform: (icon: String, color: Color, tag: String) {
        switch store.platform.lowercased() {
        case "shopify": return ("cart.fill", "#96BF48".hexColor, "E-Commerce")
        case "stripe": return ("creditcard.fill", "#635BFF".hexColor, "Payments")
        case "amazon": return ("bag.fill", "#FF9900".hexColor, "Marketplace")
        case "etsy": return ("leaf.fill", "#F1641E".hexColor, "Marketplace")
        case "woocommerce": return ("globe", "#96588A".hexColor, "E-Commerce")
        default: return ("key.fill", Theme.accent.hexColor, "Custom API")
        }
    }
    
    private var statusColor: Color {
        switch store.status {
        case "active": return Theme.emerald.hexColor
        case "pending": return Theme.accent.hexColor
        default: return Theme.error.hexColor
        }
    }
    
    private var modeLabel: String {
        switch store.mode {
        case "autonomous": return "Autonomous"
        case "copilot": return "Co-Pilot"
        case "observe": return "Observer"
        default: return store.mode.capitalized
        }
    }
    
    var body: some View {
        Button {
            // Store detail
        } label: {
            VStack(alignment: .leading, spacing: 18) {
                // Top Row: Platform + Status
                HStack {
                    HStack(spacing: 12) {
                        IconBadge(icon: platform.icon, color: platform.color, size: 44)
                        
                        VStack(alignment: .leading, spacing: 3) {
                            Text(store.name)
                                .font(.custom(Theme.FontWeight.bold, size: 20))
                                .foregroundStyle(.white)
                            
                            Text(platform.tag)
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                                .foregroundStyle(Theme.textSecondary.hexColor)
                        }
                    }
                    
                    Spacer()
                    
                    // Status
                    HStack(spacing: 5) {
                        Circle()
                            .fill(statusColor)
                            .frame(width: 7, height: 7)
                        
                        Text(store.status == "active" ? "Live" : store.status.capitalized)
                            .font(.custom(Theme.FontWeight.semiBold, size: 12))
                            .foregroundStyle(statusColor)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(statusColor.opacity(0.1))
                    .clipShape(Capsule())
                }
                
                // Metrics Row
                HStack(spacing: 0) {
                    StoreMetric(
                        label: "Products",
                        value: "\(store.productsSynced)",
                        icon: "cube.fill"
                    )
                    
                    Rectangle()
                        .fill(.white.opacity(0.06))
                        .frame(width: 1, height: 36)
                    
                    StoreMetric(
                        label: "Orders",
                        value: "\(store.ordersTotal)",
                        icon: "shippingbox.fill"
                    )
                    
                    Rectangle()
                        .fill(.white.opacity(0.06))
                        .frame(width: 1, height: 36)
                    
                    StoreMetric(
                        label: "Revenue",
                        value: "$\(Int(store.revenue))",
                        icon: "chart.line.uptrend.xyaxis"
                    )
                }
                .padding(.vertical, 12)
                .background(.white.opacity(0.03))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                // Footer: Mode + URL
                HStack {
                    // Mode badge
                    HStack(spacing: 5) {
                        Image(systemName: store.mode == "autonomous" ? "bolt.fill" : "person.fill")
                            .font(.system(size: 11, weight: .semibold))
                        Text(modeLabel)
                            .font(.custom(Theme.FontWeight.semiBold, size: 12))
                    }
                    .foregroundStyle(Theme.purple.hexColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Theme.purple.hexColor.opacity(0.1))
                    .clipShape(Capsule())
                    
                    Spacer()
                    
                    if let url = store.storeUrl {
                        HStack(spacing: 4) {
                            Image(systemName: "link")
                                .font(.system(size: 11))
                            Text(url)
                                .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                                .lineLimit(1)
                        }
                        .foregroundStyle(Theme.textDisabled.hexColor)
                    }
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.textDisabled.hexColor)
                }
            }
            .padding(20)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: 22)
                        .fill(.ultraThinMaterial)
                    
                    Circle()
                        .fill(platform.color.opacity(0.04))
                        .frame(width: 120, height: 120)
                        .blur(radius: 30)
                        .offset(x: -50, y: -30)
                }
                .clipShape(RoundedRectangle(cornerRadius: 22))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(platform.color.opacity(0.12), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Store Metric

struct StoreMetric: View {
    let label: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.custom(Theme.FontWeight.bold, size: 18))
                .foregroundStyle(.white)
            
            HStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                Text(label)
                    .font(.custom(Theme.FontWeight.bodyRegular, size: 11))
            }
            .foregroundStyle(Theme.textTertiary.hexColor)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Empty State

struct EmptyStoresView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer().frame(height: 60)
            
            ZStack {
                Circle()
                    .fill(.white.opacity(0.03))
                    .frame(width: 88, height: 88)
                
                Circle()
                    .stroke(.white.opacity(0.06), lineWidth: 1)
                    .frame(width: 88, height: 88)
                
                Image(systemName: "bolt.horizontal.fill")
                    .font(.system(size: 38, weight: .light))
                    .foregroundStyle(Theme.textTertiary.hexColor)
            }
            
            VStack(spacing: 10) {
                Text("No integrations yet")
                    .font(.custom(Theme.FontWeight.bold, size: 24))
                    .foregroundStyle(.white)
                
                Text("Connect Shopify, Stripe, Amazon, or any\ncustom API to unleash your AI workforce.")
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                    .foregroundStyle(Theme.textSecondary.hexColor)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            
            // Platform previews
            HStack(spacing: 16) {
                PlatformPreview(icon: "cart.fill", color: "#96BF48".hexColor)
                PlatformPreview(icon: "creditcard.fill", color: "#635BFF".hexColor)
                PlatformPreview(icon: "bag.fill", color: "#FF9900".hexColor)
                PlatformPreview(icon: "leaf.fill", color: "#F1641E".hexColor)
            }
            .padding(.top, 8)
            
            Spacer()
        }
        .padding(.horizontal, 32)
    }
}

struct PlatformPreview: View {
    let icon: String
    let color: Color
    
    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.1))
                .frame(width: 50, height: 50)
            
            Image(systemName: icon)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(color.opacity(0.6))
        }
    }
}

// MARK: - Add Store Sheet

struct AddStoreSheet: View {
    let viewModel: StoresViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var name = ""
    @State private var selectedPlatform = "shopify"
    @State private var apiKey = ""
    @State private var storeUrl = ""
    @State private var isSubmitting = false
    
    private let platforms: [(id: String, name: String, icon: String, color: Color)] = [
        ("shopify", "Shopify", "cart.fill", "#96BF48".hexColor),
        ("stripe", "Stripe", "creditcard.fill", "#635BFF".hexColor),
        ("amazon", "Amazon", "bag.fill", "#FF9900".hexColor),
        ("etsy", "Etsy", "leaf.fill", "#F1641E".hexColor),
        ("woocommerce", "WooCommerce", "globe", "#96588A".hexColor),
        ("custom", "Custom API", "key.fill", Theme.accent.hexColor)
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        // Platform Selection
                        VStack(alignment: .leading, spacing: 14) {
                            Text("Platform")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(.white)
                            
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                                ForEach(platforms, id: \.id) { platform in
                                    Button {
                                        withAnimation(Theme.Anim.snappy) {
                                            selectedPlatform = platform.id
                                        }
                                    } label: {
                                        VStack(spacing: 10) {
                                            ZStack {
                                                Circle()
                                                    .fill(platform.color.opacity(selectedPlatform == platform.id ? 0.2 : 0.08))
                                                    .frame(width: 44, height: 44)
                                                
                                                Image(systemName: platform.icon)
                                                    .font(.system(size: 20, weight: .medium))
                                                    .foregroundStyle(platform.color)
                                            }
                                            
                                            Text(platform.name)
                                                .font(.custom(Theme.FontWeight.medium, size: 13))
                                                .foregroundStyle(selectedPlatform == platform.id ? .white : Theme.textSecondary.hexColor)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 14)
                                        .background(selectedPlatform == platform.id ? platform.color.opacity(0.08) : .white.opacity(0.03))
                                        .clipShape(RoundedRectangle(cornerRadius: 16))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 16)
                                                .stroke(selectedPlatform == platform.id ? platform.color.opacity(0.3) : .white.opacity(0.04), lineWidth: 1)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                    .sensoryFeedback(.selection, trigger: selectedPlatform == platform.id)
                                }
                            }
                        }
                        
                        // Fields
                        VStack(alignment: .leading, spacing: 18) {
                            SheetField(label: "Store Name", placeholder: "My Store", text: $name)
                            SheetField(label: "Store URL", placeholder: "https://mystore.com", text: $storeUrl, keyboard: .URL, autocapitalization: .never)
                            SheetField(label: "API Key (Optional)", placeholder: "Enter API key", text: $apiKey, isSecure: true)
                        }
                        
                        // Submit
                        Button {
                            isSubmitting = true
                            Task {
                                await viewModel.createStore(
                                    name: name,
                                    platform: selectedPlatform,
                                    apiKey: apiKey.isEmpty ? nil : apiKey,
                                    storeUrl: storeUrl.isEmpty ? nil : storeUrl
                                )
                                isSubmitting = false
                                dismiss()
                            }
                        } label: {
                            ZStack {
                                if isSubmitting {
                                    ProgressView().tint(.white)
                                } else {
                                    HStack(spacing: 8) {
                                        Image(systemName: "bolt.fill")
                                            .font(.system(size: 15, weight: .semibold))
                                        Text("Connect Store")
                                            .font(.custom(Theme.FontWeight.semiBold, size: 17))
                                    }
                                }
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 56)
                            .background(name.isEmpty ? Theme.textDisabled.hexColor : Theme.emeraldGradient)
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .shadow(color: name.isEmpty ? .clear : Theme.emerald.hexColor.opacity(0.3), radius: 12, y: 6)
                        }
                        .disabled(name.isEmpty || isSubmitting)
                        .buttonStyle(ScaleButtonStyle())
                        .padding(.top, 4)
                    }
                    .padding(24)
                }
                .scrollDismissesKeyboard(.interactively)
            }
            .navigationTitle("Add Integration")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Theme.emerald.hexColor)
                }
            }
        }
    }
}

struct SheetField: View {
    let label: String
    let placeholder: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default
    var autocapitalization: TextInputAutocapitalization = .sentences
    var isSecure: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.custom(Theme.FontWeight.semiBold, size: 15))
                .foregroundStyle(.white)
            
            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboard)
                        .textInputAutocapitalization(autocapitalization)
                }
            }
            .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
            .foregroundStyle(.white)
            .padding(16)
            .background(.white.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(.white.opacity(0.06), lineWidth: 1)
            )
        }
    }
}

#Preview {
    StoresView()
}
import SwiftUI

struct StoresView: View {
    @State private var viewModel = StoresViewModel()
    @State private var showAddStore = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Header
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Integrations")
                                    .font(.custom(Theme.FontWeight.bold, size: 34))
                                    .foregroundStyle(Theme.textPrimary.hexColor)
                                
                                Text("Connect your business data")
                                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                            }
                            
                            Spacer()
                            
                            Button {
                                showAddStore = true
                            } label: {
                                ZStack {
                                    Circle()
                                        .fill(Theme.textPrimary.hexColor)
                                        .frame(width: 48, height: 48)
                                        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 4)
                                    
                                    Image(systemName: "plus")
                                        .font(.system(size: 22, weight: .bold))
                                        .foregroundStyle(Theme.bgPrimary.hexColor)
                                }
                            }
                            .sensoryFeedback(.selection, trigger: showAddStore)
                        }
                        .padding(.horizontal, 24)
                        .padding(.top, 16)
                        
                        // Stores List
                        if viewModel.stores.isEmpty && !viewModel.isLoading {
                            EmptyStoresView()
                        } else {
                            VStack(spacing: 16) {
                                ForEach(viewModel.stores) { store in
                                    StoreCard(store: store)
                                        .transition(.asymmetric(
                                            insertion: .move(edge: .trailing).combined(with: .opacity),
                                            removal: .opacity
                                        ))
                                }
                            }
                            .padding(.horizontal, 24)
                        }
                        
                        Spacer()
                            .frame(height: 100)
                    }
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await viewModel.fetchStores()
                }
                
                // Loading State
                if viewModel.isLoading && viewModel.stores.isEmpty {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Theme.emerald.hexColor)
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showAddStore) {
                AddStoreSheet(viewModel: viewModel)
            }
        }
        .task {
            if viewModel.stores.isEmpty {
                await viewModel.fetchStores()
            }
        }
    }
}

// MARK: - Store Card

struct StoreCard: View {
    let store: Store
    
    private var platformMeta: (icon: String, color: Color, tag: String) {
        switch store.platform.lowercased() {
        case "shopify":
            return ("cart.fill", "#96BF48".hexColor, "E-Commerce")
        case "stripe":
            return ("creditcard.fill", "#635BFF".hexColor, "Payments")
        case "amazon":
            return ("bag.fill", "#FF9900".hexColor, "Marketplace")
        default:
            return ("key.fill", Theme.accent.hexColor, "Custom API")
        }
    }
    
    private var statusColor: Color {
        store.status == "active" ? Theme.emerald.hexColor : "#EF4444".hexColor
    }
    
    var body: some View {
        Button {
            // Handle store tap
        } label: {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    ZStack {
                        Circle()
                            .fill(platformMeta.color.opacity(0.15))
                            .frame(width: 48, height: 48)
                        
                        Circle()
                            .stroke(platformMeta.color.opacity(0.4), lineWidth: 1)
                            .frame(width: 48, height: 48)
                        
                        Image(systemName: platformMeta.icon)
                            .font(.system(size: 22, weight: .medium))
                            .foregroundStyle(platformMeta.color)
                    }
                    
                    Spacer()
                    
                    // Status Badge
                    HStack(spacing: 6) {
                        Image(systemName: store.status == "active" ? "bolt.fill" : "exclamationmark.triangle.fill")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(statusColor)
                        
                        Text(store.status == "active" ? "Connected" : "Action Required")
                            .font(.custom(Theme.FontWeight.semiBold, size: 13))
                            .foregroundStyle(statusColor)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.05))
                    .clipShape(Capsule())
                }
                
                // Store Info
                VStack(alignment: .leading, spacing: 8) {
                    Text(store.name)
                        .font(.custom(Theme.FontWeight.bold, size: 22))
                        .foregroundStyle(Theme.textPrimary.hexColor)
                    
                    Text("\(platformMeta.tag) • Last synced 2m ago")
                        .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                        .foregroundStyle(Theme.textSecondary.hexColor)
                }
                
                // Divider
                Rectangle()
                    .fill(.white.opacity(0.06))
                    .frame(height: 1)
                
                // Footer
                HStack {
                    HStack(spacing: 8) {
                        Image(systemName: "link")
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.textSecondary.hexColor)
                        
                        Text(store.storeUrl ?? "N/A")
                            .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                            .foregroundStyle(Theme.textDisabled.hexColor)
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "shield.checkmark")
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.textDisabled.hexColor)
                }
            }
            .padding(24)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(.white.opacity(0.06), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Empty State

struct EmptyStoresView: View {
    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(.white.opacity(0.03))
                    .frame(width: 80, height: 80)
                
                Circle()
                    .stroke(.white.opacity(0.06), lineWidth: 1)
                    .frame(width: 80, height: 80)
                
                Image(systemName: "bolt.horizontal.fill")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(Theme.textSecondary.hexColor)
            }
            
            VStack(spacing: 12) {
                Text("No integrations found")
                    .font(.custom(Theme.FontWeight.bold, size: 24))
                    .foregroundStyle(Theme.textPrimary.hexColor)
                
                Text("Connect external platforms to enable AI actions across your ecosystem.")
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(Theme.textSecondary.hexColor)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 32)
            }
            
            Spacer()
        }
        .padding(.top, 80)
        .padding(.horizontal, 32)
    }
}

// MARK: - Add Store Sheet

struct AddStoreSheet: View {
    let viewModel: StoresViewModel
    @Environment(\.dismiss) private var dismiss
    
    @State private var name = ""
    @State private var selectedPlatform = "shopify"
    @State private var apiKey = ""
    @State private var storeUrl = ""
    
    private let platforms = [
        ("shopify", "Shopify", "cart.fill"),
        ("stripe", "Stripe", "creditcard.fill"),
        ("amazon", "Amazon", "bag.fill"),
        ("custom", "Custom API", "key.fill")
    ]
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        // Platform Selection
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Platform")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                            
                            VStack(spacing: 8) {
                                ForEach(platforms, id: \.0) { platform in
                                    Button {
                                        selectedPlatform = platform.0
                                    } label: {
                                        HStack(spacing: 16) {
                                            Image(systemName: platform.2)
                                                .font(.system(size: 20, weight: .medium))
                                                .foregroundStyle(selectedPlatform == platform.0 ? Theme.emerald.hexColor : Theme.textSecondary.hexColor)
                                                .frame(width: 40)
                                            
                                            Text(platform.1)
                                                .font(.custom(Theme.FontWeight.medium, size: 16))
                                                .foregroundStyle(Theme.textPrimary.hexColor)
                                            
                                            Spacer()
                                            
                                            if selectedPlatform == platform.0 {
                                                Image(systemName: "checkmark.circle.fill")
                                                    .font(.system(size: 20))
                                                    .foregroundStyle(Theme.emerald.hexColor)
                                            }
                                        }
                                        .padding(16)
                                        .background(.white.opacity(selectedPlatform == platform.0 ? 0.08 : 0.04))
                                        .clipShape(RoundedRectangle(cornerRadius: 16))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                        
                        // Name Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Store Name")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                            
                            TextField("My Store", text: $name)
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                                .padding(16)
                                .background(.white.opacity(0.04))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        
                        // URL Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Store URL")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                            
                            TextField("https://mystore.com", text: $storeUrl)
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.URL)
                                .padding(16)
                                .background(.white.opacity(0.04))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        
                        // API Key Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("API Key (Optional)")
                                .font(.custom(Theme.FontWeight.semiBold, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                            
                            SecureField("Enter API key", text: $apiKey)
                                .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                                .foregroundStyle(Theme.textPrimary.hexColor)
                                .padding(16)
                                .background(.white.opacity(0.04))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        
                        Button {
                            Task {
                                await viewModel.createStore(
                                    name: name,
                                    platform: selectedPlatform,
                                    apiKey: apiKey.isEmpty ? nil : apiKey,
                                    storeUrl: storeUrl.isEmpty ? nil : storeUrl
                                )
                                dismiss()
                            }
                        } label: {
                            Text("Connect Store")
                                .font(.custom(Theme.FontWeight.bold, size: 18))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .background(name.isEmpty ? Theme.textDisabled.hexColor : Theme.emerald.hexColor)
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }
                        .disabled(name.isEmpty)
                        .padding(.top, 8)
                    }
                    .padding(24)
                }
            }
            .navigationTitle("Add Integration")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    StoresView()
}
