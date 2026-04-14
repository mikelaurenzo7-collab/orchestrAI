import SwiftUI

// MARK: - Glass Card Modifier

struct GlassCard: ViewModifier {
    var cornerRadius: CGFloat = 24
    var borderOpacity: Double = 0.08
    
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(.white.opacity(borderOpacity), lineWidth: 1)
            )
    }
}

extension View {
    func glassCard(cornerRadius: CGFloat = 24, borderOpacity: Double = 0.08) -> some View {
        modifier(GlassCard(cornerRadius: cornerRadius, borderOpacity: borderOpacity))
    }
}

// MARK: - Scale Button Style

struct ScaleButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.6), value: configuration.isPressed)
    }
}

// MARK: - Pulse Indicator

struct PulseIndicator: View {
    let color: Color
    var size: CGFloat = 8
    @State private var isPulsing = false
    
    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.3))
                .frame(width: size * 2.5, height: size * 2.5)
                .scaleEffect(isPulsing ? 1.0 : 0.5)
                .opacity(isPulsing ? 0.0 : 0.6)
            
            Circle()
                .fill(color)
                .frame(width: size, height: size)
                .shadow(color: color.opacity(0.6), radius: 4)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: false)) {
                isPulsing = true
            }
        }
    }
}

// MARK: - Shimmer Loading

struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -200
    
    func body(content: Content) -> some View {
        content
            .overlay(
                LinearGradient(
                    colors: [.clear, .white.opacity(0.08), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
                .rotationEffect(.degrees(20))
                .offset(x: phase)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 400
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerModifier())
    }
}

// MARK: - Shimmer Placeholder

struct ShimmerRect: View {
    var width: CGFloat? = nil
    var height: CGFloat = 16
    var cornerRadius: CGFloat = 8
    
    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(.white.opacity(0.06))
            .frame(width: width, height: height)
            .shimmer()
    }
}

// MARK: - Staggered Entrance

struct StaggeredItem: ViewModifier {
    let index: Int
    @State private var appeared = false
    
    func body(content: Content) -> some View {
        content
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 20)
            .onAppear {
                withAnimation(Theme.Anim.smooth.delay(Double(index) * 0.06)) {
                    appeared = true
                }
            }
    }
}

extension View {
    func staggered(index: Int) -> some View {
        modifier(StaggeredItem(index: index))
    }
}

// MARK: - Ambient Orb

struct AmbientOrb: View {
    let color: Color
    let size: CGFloat
    @State private var offset: CGSize = .zero
    @State private var scale: CGFloat = 1.0
    
    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [color.opacity(0.35), color.opacity(0.0)],
                    center: .center,
                    startRadius: 0,
                    endRadius: size / 2
                )
            )
            .frame(width: size, height: size)
            .blur(radius: size * 0.3)
            .scaleEffect(scale)
            .offset(offset)
            .onAppear {
                withAnimation(.easeInOut(duration: Double.random(in: 6...10)).repeatForever(autoreverses: true)) {
                    offset = CGSize(
                        width: CGFloat.random(in: -60...60),
                        height: CGFloat.random(in: -60...60)
                    )
                    scale = CGFloat.random(in: 0.8...1.2)
                }
            }
    }
}

// MARK: - Ambient Background

struct AmbientOrbsBackground: View {
    var body: some View {
        ZStack {
            AmbientOrb(color: Theme.emerald.hexColor, size: 280)
                .offset(x: -100, y: -220)
            
            AmbientOrb(color: Theme.purple.hexColor, size: 220)
                .offset(x: 130, y: -60)
            
            AmbientOrb(color: Theme.blue.hexColor, size: 180)
                .offset(x: -80, y: 200)
            
            AmbientOrb(color: Theme.emerald.hexColor, size: 160)
                .offset(x: 100, y: 320)
        }
        .opacity(0.5)
    }
}

// MARK: - Icon Badge

struct IconBadge: View {
    let icon: String
    let color: Color
    var size: CGFloat = 48
    
    var body: some View {
        ZStack {
            Circle()
                .fill(color.opacity(0.12))
                .frame(width: size, height: size)
            
            Circle()
                .stroke(color.opacity(0.25), lineWidth: 1)
                .frame(width: size, height: size)
            
            Image(systemName: icon)
                .font(.system(size: size * 0.45, weight: .medium))
                .foregroundStyle(color)
        }
    }
}

// MARK: - Section Header

struct SectionHeader: View {
    let icon: String
    let title: String
    let color: Color
    var trailing: String? = nil
    
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(color)
            
            Text(title)
                .font(.custom(Theme.FontWeight.bold, size: 20))
                .foregroundStyle(Theme.textPrimary.hexColor)
            
            Spacer()
            
            if let trailing {
                Text(trailing)
                    .font(.custom(Theme.FontWeight.bodyMedium, size: 14))
                    .foregroundStyle(Theme.textTertiary.hexColor)
            }
        }
    }
}
