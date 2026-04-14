import SwiftUI

struct DashboardView: View {
    @Environment(AuthService.self) private var authService
    @State private var viewModel = DashboardViewModel()
    @State private var showSettings = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Trial Banner
                        if let trialEnd = authService.currentUser?.trialEndsAt {
                            TrialBannerView(trialEndsAt: trialEnd)
                                .transition(.move(edge: .top).combined(with: .opacity))
                        }
                        
                        // Stats Grid
                        if let metrics = viewModel.metrics {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                                StatCard(
                                    title: "Active Stores",
                                    value: "\(metrics.totalStores)",
                                    subtitle: "Connected",
                                    icon: "storefront.fill",
                                    color: Theme.emerald.hexColor
                                )
                                
                                StatCard(
                                    title: "AI Agents",
                                    value: "\(metrics.activeAgents)",
                                    subtitle: "Online",
                                    icon: "person.3.fill",
                                    color: Theme.blue.hexColor
                                )
                                
                                StatCard(
                                    title: "Tasks Done",
                                    value: "\(metrics.tasksCompleted)",
                                    subtitle: "This month",
                                    icon: "checkmark.circle.fill",
                                    color: Theme.accent.hexColor
                                )
                                
                                StatCard(
                                    title: "Revenue",
                                    value: "$\(Int(metrics.totalRevenue))",
                                    subtitle: "Total",
                                    icon: "dollarsign.circle.fill",
                                    color: "#10B981".hexColor
                                )
                            }
                            .padding(.horizontal, 24)
                        }
                        
                        // Recent Activity
                        if let metrics = viewModel.metrics, !metrics.recentActivity.isEmpty {
                            VStack(alignment: .leading, spacing: 16) {
                                HStack {
                                    Image(systemName: "clock.arrow.circlepath")
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundStyle(Theme.emerald.hexColor)
                                    
                                    Text("Recent Activity")
                                        .font(.custom(Theme.FontWeight.bold, size: 22))
                                        .foregroundStyle(Theme.textPrimary.hexColor)
                                    
                                    Spacer()
                                }
                                .padding(.horizontal, 24)
                                
                                VStack(spacing: 12) {
                                    ForEach(Array(metrics.recentActivity.prefix(10).enumerated()), id: \.element.id) { index, activity in
                                        ActivityRow(activity: activity)
                                            .transition(.asymmetric(
                                                insertion: .move(edge: .trailing).combined(with: .opacity),
                                                removal: .opacity
                                            ))
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                        
                        Spacer()
                            .frame(height: 100)
                    }
                    .padding(.top, 16)
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await viewModel.fetchDashboard()
                }
                
                // Loading State
                if viewModel.isLoading && viewModel.metrics == nil {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(Theme.emerald.hexColor)
                }
            }
            .navigationTitle("Mission Control")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Theme.textSecondary.hexColor)
                    }
                    .sensoryFeedback(.selection, trigger: showSettings)
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
        }
        .task {
            await viewModel.fetchDashboard()
        }
    }
}

// MARK: - Trial Banner

struct TrialBannerView: View {
    let trialEndsAt: String
    
    private var daysRemaining: Int {
        let formatter = ISO8601DateFormatter()
        guard let endDate = formatter.date(from: trialEndsAt) else { return 0 }
        let days = Calendar.current.dateComponents([.day], from: Date(), to: endDate).day ?? 0
        return max(0, days)
    }
    
    var body: some View {
        HStack(spacing: 16) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Theme.emerald.hexColor.opacity(0.15))
                        .frame(width: 40, height: 40)
                    
                    Image(systemName: "sparkles")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(Theme.emerald.hexColor)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Free Trial")
                        .font(.custom(Theme.FontWeight.semiBold, size: 16))
                        .foregroundStyle(Theme.textPrimary.hexColor)
                    
                    Text("\(daysRemaining) days remaining")
                        .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                        .foregroundStyle(Theme.textSecondary.hexColor)
                }
            }
            
            Spacer()
            
            Button {
                // Handle upgrade
            } label: {
                Text("Upgrade")
                    .font(.custom(Theme.FontWeight.semiBold, size: 14))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Theme.emerald.hexColor)
                    .clipShape(Capsule())
            }
            .sensoryFeedback(.impact(weight: .medium), trigger: UUID())
        }
        .padding(20)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(.white.opacity(0.08), lineWidth: 1)
        )
        .padding(.horizontal, 24)
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 48, height: 48)
                
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(color)
            }
            
            Text(title)
                .font(.custom(Theme.FontWeight.medium, size: 14))
                .foregroundStyle(Theme.textSecondary.hexColor)
            
            Text(value)
                .font(.custom(Theme.FontWeight.bold, size: 28))
                .foregroundStyle(Theme.textPrimary.hexColor)
            
            if !subtitle.isEmpty {
                Text(subtitle)
                    .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                    .foregroundStyle(Theme.textDisabled.hexColor)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(color.opacity(0.3), lineWidth: 1)
        )
    }
}

// MARK: - Activity Row

struct ActivityRow: View {
    let activity: ActivityItem
    
    private var icon: String {
        switch activity.type.lowercased() {
        case "store": return "storefront.fill"
        case "agent": return "person.fill.badge.checkmark"
        case "task": return "checkmark.circle.fill"
        case "social": return "megaphone.fill"
        case "revenue": return "dollarsign.circle.fill"
        default: return "circle.fill"
        }
    }
    
    private var color: Color {
        switch activity.type.lowercased() {
        case "store": return Theme.emerald.hexColor
        case "agent": return Theme.blue.hexColor
        case "task": return "#10B981".hexColor
        case "social": return Theme.accent.hexColor
        case "revenue": return "#10B981".hexColor
        default: return Theme.textSecondary.hexColor
        }
    }
    
    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 36, height: 36)
                
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(color)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(activity.message)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                    .foregroundStyle(Theme.textPrimary.hexColor)
                    .lineLimit(2)
                
                Text(relativeTime(from: activity.timestamp))
                    .font(.custom(Theme.FontWeight.bodyRegular, size: 13))
                    .foregroundStyle(Theme.textDisabled.hexColor)
            }
            
            Spacer()
        }
        .padding(.vertical, 8)
    }
    
    private func relativeTime(from isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else { return "Now" }
        
        let seconds = Date().timeIntervalSince(date)
        if seconds < 60 { return "Just now" }
        if seconds < 3600 { return "\(Int(seconds/60))m ago" }
        if seconds < 86400 { return "\(Int(seconds/3600))h ago" }
        return "\(Int(seconds/86400))d ago"
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthService.self) private var authService
    
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button(role: .destructive) {
                        authService.logout()
                        dismiss()
                    } label: {
                        Label("Sign Out", systemImage: "arrow.right.square")
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    DashboardView()
        .environment(AuthService.shared)
}
