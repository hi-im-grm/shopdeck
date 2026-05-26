use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create core tables",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "notes: separate customer_id and product_id columns",
            sql: include_str!("../migrations/002_note_multi_links.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "customer tags, product price history, offer templates",
            sql: include_str!("../migrations/003_tags_history_templates.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "app_settings (password, backup folder) and audit_log",
            sql: include_str!("../migrations/004_security_audit_backup.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:shopdeck.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
