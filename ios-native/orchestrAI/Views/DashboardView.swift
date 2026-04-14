import SwiftUI

struct DashboardView: View {
    @Environment(AuthService.self) private var authService
    @State private var viewModel = DashboardViewModel()
    @State private var showSettings = false
    @State private var appeared = false
    
    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default: return "Burning midnight oil"
        }
    }
    
    private var firstName: String {
        authService.currentUser?.name.components(separatedBy: " ").first ?? "Commander"
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Personalized Header
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(greeting),")
                                .font(.custom(Theme.FontWeight.bodyRegular, size: 16))
                                .foregroundStyle(Theme.textSecondary.hexColor)
                            
                            Text(firstName)
                                .font(.custom(Theme.FontWeight.bold, size: 34))
                                .foregroundStyle(.white)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                        .staggered(index: 0)
                        
                        // Trial Banner
                        if let trialEnd = authService.currentUser?.trialEndsAt {
                            TrialBannerView(trialEndsAt: trialEnd)
                                .staggered(index: 1)
                        }
                        
                        // Stats Grid
                        if let metrics = viewModel.metrics {
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 14) {
                                StatCard(
                                    title: "Active Stores",
                                    value: "\(metrics.totalStores)",
                                    subtitle: "Connected",
                                    icon: "storefront.fill",
                                    color: Theme.emerald.hexColor
                                )
                                .staggered(index: 2)
                                
                                StatCard(
                                    title: "AI Agents",
                                    value: "\(metrics.activeAgents)",
                                    subtitle: "Online",
                                    icon: "cpu.fill",
                                    color: Theme.purple.hexColor
                                )
                                .staggered(index: 3)
                                
                                StatCard(
                                    title: "Tasks Done",
                                    value: "\(metrics.tasksCompleted)",
                                    subtitle: "This month",
                                    icon: "checkmark.seal.fill",
                                    color: Theme.blue.hexColor
                                )
                                .staggered(index: 4)
                                
                                StatCard(
                                    title: "Revenue",
                                    value: "$\(formatRevenue(metrics.totalRevenue))",
                                    subtitle: "Total tracked",
                                    icon: "chart.line.uptrend.xyaxis",
                                    color: Theme.success.hexColor
                                )
                                .staggered(index: 5)
                            }
                            .padding(.horizontal, 24)
                        } else if viewModel.isLoading {
                            // Shimmer placeholders
                            LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 14) {
                                ForEach(0..<4, id: \.self) { _ in
                                    RoundedRectangle(cornerRadius: 20)
                                        .fill(.white.opacity(0.04))
                                        .frame(height: 160)
                                        .shimmer()
                                }
                            }
                            .padding(.horizontal, 24)
                        }
                        
                        // Quick Actions
                        if viewModel.metrics != nil {
                            VStack(spacing: 16) {
                                SectionHeader(
                                    icon: "bolt.fill",
                                    title: "Quick Actions",
                                    color: Theme.accent.hexColor
                                )
                                .padding(.horizontal, 24)
                                .staggered(index: 6)
                                
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 12) {
                                        QuickActionPill(icon: "plus.circle.fill", title: "New Store", color: Theme.emerald.hexColor)
                                        QuickActionPill(icon: "sparkles", title: "AI Campaign", color: Theme.purple.hexColor)
                                        QuickActionPill(icon: "chart.bar.fill", title: "Analytics", color: Theme.blue.hexColor)
                                        QuickActionPill(icon: "gearshape.2.fill", title: "Workflows", color: Theme.accent.hexColor)
                                    }
                                    .padding(.horizontal, 24)
                                }
                                .staggered(index: 7)
                            }
                        }
                        
                        // Recent Activity
                        if let metrics = viewModel.metrics, !metrics.recentActivity.isEmpty {
                            VStack(spacing: 14) {
                                SectionHeader(
                                    icon: "clock.arrow.circlepath",
                                    title: "Recent Activity",
                                    color: Theme.emerald.hexColor,
                                    trailing: "\(metrics.recentActivity.count) events"
                                )
                                .padding(.horizontal, 24)
                                .staggered(index: 8)
                                
                                VStack(spacing: 2) {
                                    ForEach(Array(metrics.recentActivity.prefix(8).enumerated()), id: \.element.id) { index, activity in
                                        ActivityRow(activity: activity)
                                            .staggered(index: 9 + index)
                                    }
                                }
                                .padding(.horizontal, 24)
                            }
                        }
                        
                        Spacer().frame(height: 100)
                    }
                    .padding(.top, 8)
                }
                .scrollIndicators(.hidden)
                .refreshable {
                    await viewModel.fetchDashboard()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 8) {
                        Image(systemName: "brain.filled.head.profile")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(Theme.emerald.hexColor)
                        
                        Text("HQ")
                            .font(.custom(Theme.FontWeight.bold, size: 18))
                            .foregroundStyle(.white)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        ZStack {
                            Circle()
                                .fill(.white.opacity(0.06))
                                .frame(width: 36, height: 36)
                            
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundStyle(Theme.textSecondary.hexColor)
                        }
                    }
                    .sensoryFeedback(.selection, trigger: showSettings)
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
                    .environment(authService)
            }
        }
        .task {
            await viewModel.fetchDashboard()
        }
    }
    
    private func formatRevenue(_ value: Double) -> String {
        if value >= 1_000_000 { return String(format: "%.1fM", value / 1_000_000) }
        if value >= 1_000 { return String(format: "%.1fK", value / 1_000) }
        return String(format: "%.0f", value)
    }
}

// MARK: - Trial Banner

struct TrialBannerView: View {
    let trialEndsAt: String
    
    private var daysRemaining: Int {
        let formatter = ISO8601DateFormatter()
        guard let endDate = formatter.date(from: trialEndsAt) else { return 0 }
        return max(0, Calendar.current.dateComponents([.day], from: Date(), to: endDate).day ?? 0)
    }
    
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Theme.emerald.hexColor.opacity(0.12))
                    .frame(width: 42, height: 42)
                
                Image(systemName: "sparkles")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(Theme.emerald.hexColor)
            }
            
            VStack(alignment: .leading, spacing: 3) {
                Text("Free Trial Active")
                    .font(.custom(Theme.FontWeight.semiBold, size: 15))
                    .foregroundStyle(.white)
                
                Text("\(daysRemaining) days remaining • Upgrade anytime")
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 13))
                    .foregroundStyle(Theme.textSecondary.hexColor)
            }
            
            Spacer()
            
            Button {
                // Upgrade flow
            } label: {
                Text("Pro")
                    .font(.custom(Theme.FontWeight.bold, size: 13))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Theme.emeraldGradient)
                    .clipShape(Capsule())
                    .shadow(color: Theme.emerald.hexColor.opacity(0.3), radius: 8, y: 4)
            }
            .buttonStyle(ScaleButtonStyle())
        }
        .padding(18)
        .glassCard(cornerRadius: 20)
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
    @State private var appeared = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                IconBadge(icon: icon, color: color, size: 44)
                
                Spacer()
                
                PulseIndicator(color: color, size: 6)
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(value)
                    .font(.custom(Theme.FontWeight.bold, size: 30))
                    .foregroundStyle(.white)
                    .contentTransition(.numericText())
                
                Text(title)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                    .foregroundStyle(Theme.textSecondary.hexColor)
                
                Text(subtitle)
                    .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                    .foregroundStyle(Theme.textTertiary.hexColor)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: 22)
                    .fill(.ultraThinMaterial)
                
                // Accent glow in top-right corner
                Circle()
                    .fill(color.opacity(0.06))
                    .frame(width: 80, height: 80)
                    .blur(radius: 20)
                    .offset(x: 30, y: -30)
            }
            .clipShape(RoundedRectangle(cornerRadius: 22))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22)
                .stroke(color.opacity(0.15), lineWidth: 1)
        )
    }
}

// MARK: - Quick Action Pill

struct QuickActionPill: View {
    let icon: String
    let title: String
    let color: Color
    
    var body: some View {
        Button {
            // Action handler
        } label: {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(color)
                
                Text(title)
                    .font(.custom(Theme.FontWeight.semiBold, size: 14))
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(.white.opacity(0.06))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(color.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
        .sensoryFeedback(.selection, trigger: UUID())
    }
}

// MARK: - Activity Row

struct ActivityRow: View {
    let activity: ActivityItem
    
    private var meta: (icon: String, color: Color) {
        switch activity.type.lowercased() {
        case "store": return ("storefront.fill", Theme.emerald.hexColor)
        case "agent": return ("cpu.fill", Theme.purple.hexColor)
        case "task": return ("checkmark.seal.fill", Theme.success.hexColor)
        case "social": return ("megaphone.fill", Theme.accent.hexColor)
        case "revenue": return ("chart.line.uptrend.xyaxis", Theme.success.hexColor)
        case "workflow": return ("arrow.triangle.branch", Theme.blue.hexColor)
        default: return ("circle.fill", Theme.textSecondary.hexColor)
        }
    }
    
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(meta.color.opacity(0.1))
                    .frame(width: 38, height: 38)
                
                Image(systemName: meta.icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(meta.color)
            }
            
            VStack(alignment: .leading, spacing: 3) {
                Text(activity.message)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 15))
                    .foregroundStyle(.white)
                    .lineLimit(2)
                
                Text(relativeTime(from: activity.timestamp))
                    .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                    .foregroundStyle(Theme.textTertiary.hexColor)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.textDisabled.hexColor)
        }
        .padding(.vertical, 10)
    }
    
    private func relativeTime(from isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else { return "Now" }
        let seconds = Date().timeIntervalSince(date)
        if seconds < 60 { return "Just now" }
        if seconds < 3600 { return "\(Int(seconds / 60))m ago" }
        if seconds < 86400 { return "\(Int(seconds / 3600))h ago" }
        return "\(Int(seconds / 86400))d ago"
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthService.self) private var authService
    
    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bgPrimary.hexColor.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Profile Card
                        VStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(Theme.emerald.hexColor.opacity(0.12))
                                    .frame(width: 72, height: 72)
                                
                                Text(authService.currentUser?.name.prefix(1).uppercased() ?? "U")
                                    .font(.custom(Theme.FontWeight.bold, size: 28))
                                    .foregroundStyle(Theme.emerald.hexColor)
                            }
                            
                            VStack(spacing: 4) {
                                Text(authService.currentUser?.name ?? "User")
                                    .font(.custom(Theme.FontWeight.bold, size: 20))
                                    .foregroundStyle(.white)
                                
                                Text(authService.currentUser?.email ?? "")
                                    .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                                    .foregroundStyle(Theme.textSecondary.hexColor)
                            }
                            
                            Text(authService.currentUser?.subscriptionStatus?.capitalized ?? "Free Trial")
                                .font(.custom(Theme.FontWeight.semiBold, size: 13))
                                .foregroundStyle(Theme.emerald.hexColor)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 6)
                                .background(Theme.emerald.hexColor.opacity(0.12))
                                .clipShape(Capsule())
                        }
                        .frame(maxWidth: .infinity)
                        .padding(24)
                        .glassCard(cornerRadius: 24)
                        .padding(.horizontal, 24)
                        
                        // Menu Items
                        VStack(spacing: 2) {
                            SettingsRow(icon: "crown.fill", title: "Subscription", color: Theme.accent.hexColor)
                            SettingsRow(icon: "bell.fill", title: "Notifications", color: Theme.blue.hexColor)
                            SettingsRow(icon: "lock.shield.fill", title: "Privacy & Security", color: Theme.purple.hexColor)
                            SettingsRow(icon: "questionmark.circle.fill", title: "Help & Support", color: Theme.cyan.hexColor)
                            SettingsRow(icon: "info.circle.fill", title: "About", color: Theme.textSecondary.hexColor)
                        }
                        .padding(.horizontal, 24)
                        
                        // Sign Out
                        Button(role: .destructive) {
                            authService.logout()
                            dismiss()
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 16, weight: .semibold))
                                Text("Sign Out")
                                    .font(.custom(Theme.FontWeight.semiBold, size: 16))
                            }
                            .foregroundStyle(Theme.error.hexColor)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Theme.error.hexColor.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .stroke(Theme.error.hexColor.opacity(0.15), lineWidth: 1)
                            )
                        }
                        .buttonStyle(ScaleButtonStyle())
                        .padding(.horizontal, 24)
                        .sensoryFeedback(.impact(weight: .medium), trigger: UUID())
                        
                        // Version
                        Text("orchestrAI v\(AppConfig.appVersion) (\(AppConfig.buildNumber))")
                            .font(.custom(Theme.FontWeight.bodyRegular, size: 12))
                            .foregroundStyle(Theme.textDisabled.hexColor)
                            .padding(.top, 8)
                        
                        Spacer().frame(height: 40)
                    }
                    .padding(.top, 16)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Theme.emerald.hexColor)
                }
            }
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let color: Color
    
    var body: some View {
        Button {
            // Navigate
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(color.opacity(0.12))
                        .frame(width: 34, height: 34)
                    
                    Image(systemName: icon)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(color)
                }
                
                Text(title)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 16))
                    .foregroundStyle(.white)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.textDisabled.hexColor)
            }
            .padding(14)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    DashboardView()
        .environment(AuthService.shared)
}
