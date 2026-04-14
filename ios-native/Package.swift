// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "orchestrAI",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "orchestrAI",
            targets: ["orchestrAI"]
        )
    ],
    dependencies: [],
    targets: [
        .target(
            name: "orchestrAI",
            dependencies: [],
            path: "orchestrAI"
        )
    ]
)
