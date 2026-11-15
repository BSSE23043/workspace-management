# Concurrent Task Report

| Agent | File | Task | Status |
|-------|------|------|--------|
| agent_1 | workspaceManagement_backend/src/schema/wms_schema.sql | Set up MySQL database by running wms_schema.sql once | done |
| agent_1 | workspaceManagement_backend/src/schema/demo_seed.sql | Insert demo company + 5 role users (Global Research Trends) to satisfy FKs | done |
| agent_1 | workspaceManagement_backend/* , workspaceManagement_frontend/src/screens/employee/MyLeaveRequestsScreen.js | Migrate Request Leave to backend with a single leave type (remove annual/sick) | done |
| agent_2 | workspaceManagement_backend/src/services/requirementService.js, requirementController.js, requirementRoutes.js, app.js, demo_seed.sql; workspaceManagement_frontend/src/services/requirementApi.js, screens/client/ClientDashboardScreen.js, MyRequirementsScreen.js | Migrate Client requirements (milestones, broadcasts, replies) fetch to MySQL backend | done |
