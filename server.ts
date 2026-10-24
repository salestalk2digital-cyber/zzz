import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/routes.ts';
import { loadDatabase, withTransaction } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API router
  app.use('/api', apiRouter);

  // Background scheduler for Twice-Daily follow-up sessions & escalations (Asia/Kolkata)
  setInterval(async () => {
    try {
      // Calculate current hour in IST
      const now = new Date();
      const istTimeStr = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istDate = new Date(istTimeStr);
      const istHour = istDate.getHours();
      const istDateOnly = istDate.toISOString().split('T')[0];

      await withTransaction((db) => {
        let changesMade = false;

        // Check overdue follow-up tasks
        for (const task of db.followUpTasks) {
          if (task.status === 'pending' && task.dueDate < istDateOnly) {
            // Overdue
            if (!task.escalatedToManager) {
              task.escalatedToManager = true;
              task.status = 'missed';
              changesMade = true;

              // Generate notification for manager
              db.notifications.unshift({
                id: `esc-mgr-${Date.now()}-${task.id}`,
                type: 'escalation',
                title: `Escalation: Overdue Follow-Up for ${task.leadName}`,
                message: `Task for ${task.leadName} (${task.outletId.toUpperCase()}) was missed. Assigned to ${task.assignedToName}.`,
                severity: 'high',
                leadId: task.leadId,
                outletId: task.outletId,
                createdAt: new Date().toISOString(),
                read: false,
                resolved: false,
              });
            }
          }
        }

        // WhatsApp Missing Actions check
        for (const lead of db.leads) {
          if (
            lead.whatsAppActionMissing &&
            lead.status !== 'Converted / Booked' &&
            lead.status !== 'Lost / Closed' &&
            !lead.doNotContact
          ) {
            // Check if notification already exists
            const existingNotif = db.notifications.find((n) => n.leadId === lead.id && n.type === 'whatsapp_missing' && !n.resolved);
            if (!existingNotif) {
              db.notifications.unshift({
                id: `wa-miss-${Date.now()}-${lead.id}`,
                type: 'whatsapp_missing',
                title: `WhatsApp Action Missing: ${lead.customerName}`,
                message: `Lead ${lead.id} (${lead.customerName}) has not received required WhatsApp outreach.`,
                severity: 'medium',
                leadId: lead.id,
                outletId: lead.outletId,
                assignedUserId: lead.assignedSalespersonId,
                createdAt: new Date().toISOString(),
                read: false,
                resolved: false,
              });
              changesMade = true;
            }
          }
        }

        if (changesMade) {
          // Transaction will auto-save
        }
      });
    } catch (err) {
      console.error('Error in background scheduler:', err);
    }
  }, 60000); // run every minute

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZigZagZoh CRM] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Supreme Ads] Agency management portal ready.`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
