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
