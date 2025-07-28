import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

class GmailNotificationService {
    constructor() {
        this.gmail = null;
        this.recipientEmail = null;
    }

    async authenticate() {
        try {
            let creds = null;
            const tokenPath = path.join(process.cwd(), 'token.json');
            const credentialsPath = path.join(process.cwd(), 'credentials.json');

            if (fs.existsSync(tokenPath)) {
                const tokenData = fs.readFileSync(tokenPath, 'utf8');
                creds = JSON.parse(tokenData);
            }

            if (!fs.existsSync(credentialsPath)) {
                throw new Error('Gmail credentials.json file not found. Please add your OAuth2 credentials.');
            }

            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

            const oAuth2Client = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0]
            );

            if (creds) {
                oAuth2Client.setCredentials(creds);
                
                if (creds.expiry_date && creds.expiry_date <= Date.now()) {
                    try {
                        await oAuth2Client.refreshAccessToken();
                        fs.writeFileSync(tokenPath, JSON.stringify(oAuth2Client.credentials));
                    } catch (error) {
                        console.error('Error refreshing token:', error);
                        throw new Error('Token refresh failed. Please re-authenticate.');
                    }
                }
            } else {
                throw new Error('No valid token found. Please run OAuth flow first.');
            }

            this.gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
            return this.gmail;
        } catch (error) {
            console.error('Gmail authentication error:', error);
            throw error;
        }
    }

    createEmailMessage(to, subject, bodyText, bodyHtml = null) {
        const message = [
            `To: ${to}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
            '',
            bodyHtml || bodyText
        ].join('\n');

        return {
            raw: Buffer.from(message, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        };
    }

    async sendScheduleNotification(userEmail, assignments) {
        try {
            if (!this.gmail) {
                await this.authenticate();
            }

            const subject = `Your Schedule Has Been Updated - ${assignments.length} New Assignment${assignments.length > 1 ? 's' : ''}`;
            
            const bodyText = `Hello!

Your academic schedule has been updated with ${assignments.length} new assignment${assignments.length > 1 ? 's' : ''}:

${assignments.map((assignment, index) => `${index + 1}. ${assignment.title}
   Due: ${new Date(assignment.due_date).toLocaleDateString()}
   Priority: ${assignment.priority}
   Type: ${assignment.type}
   ${assignment.description ? `Description: ${assignment.description}` : ''}
`).join('\n')}

Stay organized and never miss a deadline!

Best regards,
Trackademic Team`;

            const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; }
        .assignment { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
        .assignment-title { font-weight: bold; color: #667eea; margin-bottom: 5px; }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
        .btn { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Schedule Updated!</h1>
            <p>Your academic schedule has been updated with ${assignments.length} new assignment${assignments.length > 1 ? 's' : ''}</p>
        </div>
        
        <div class="content">
            <h2>New Assignments:</h2>
            ${assignments.map(assignment => `
                <div class="assignment priority-${assignment.priority}">
                    <div class="assignment-title">${assignment.title}</div>
                    <div><strong>Due:</strong> ${new Date(assignment.due_date).toLocaleDateString()} at ${new Date(assignment.due_date).toLocaleTimeString()}</div>
                    <div><strong>Priority:</strong> ${assignment.priority.toUpperCase()}</div>
                    <div><strong>Type:</strong> ${assignment.type}</div>
                    ${assignment.description ? `<div><strong>Description:</strong> ${assignment.description}</div>` : ''}
                    ${assignment.estimated_hours ? `<div><strong>Estimated Time:</strong> ${assignment.estimated_hours} hours</div>` : ''}
                </div>
            `).join('')}
            
            <div class="footer">
                <p>Stay organized and never miss a deadline!</p>
                <p><strong>Trackademic Team</strong></p>
            </div>
        </div>
    </div>
</body>
</html>`;

            const emailMessage = this.createEmailMessage(userEmail, subject, bodyText, bodyHtml);

            const result = await this.gmail.users.messages.send({
                userId: 'me',
                resource: emailMessage
            });

            return {
                success: true,
                messageId: result.data.id,
                message: `Schedule notification sent successfully to ${userEmail}`
            };

        } catch (error) {
            console.error('Error sending schedule notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendReminderNotification(userEmail, upcomingTasks) {
        try {
            if (!this.gmail) {
                await this.authenticate();
            }

            const subject = `Reminder: You have ${upcomingTasks.length} task${upcomingTasks.length > 1 ? 's' : ''} due soon!`;
            
            const bodyText = `Hello!

This is a friendly reminder that you have ${upcomingTasks.length} task${upcomingTasks.length > 1 ? 's' : ''} due soon:

${upcomingTasks.map((task, index) => `${index + 1}. ${task.title}
   Due: ${new Date(task.due_date).toLocaleDateString()}
   Priority: ${task.priority}
`).join('\n')}

Don't forget to complete them on time!

Best regards,
Trackademic Team`;

            const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ffc107 0%, #ff8c00 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; }
        .task { background: white; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }
        .task-title { font-weight: bold; color: #ff8c00; margin-bottom: 5px; }
        .priority-high { border-left-color: #dc3545; }
        .priority-medium { border-left-color: #ffc107; }
        .priority-low { border-left-color: #28a745; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Reminder Alert!</h1>
            <p>You have ${upcomingTasks.length} task${upcomingTasks.length > 1 ? 's' : ''} due soon</p>
        </div>
        
        <div class="content">
            <h2>Upcoming Tasks:</h2>
            ${upcomingTasks.map(task => `
                <div class="task priority-${task.priority}">
                    <div class="task-title">${task.title}</div>
                    <div><strong>Due:</strong> ${new Date(task.due_date).toLocaleDateString()} at ${new Date(task.due_date).toLocaleTimeString()}</div>
                    <div><strong>Priority:</strong> ${task.priority.toUpperCase()}</div>
                    <div><strong>Time left:</strong> ${this.getTimeUntilDue(task.due_date)}</div>
                </div>
            `).join('')}
            
            <div class="footer">
                <p>Don't forget to complete them on time!</p>
                <p><strong>Trackademic Team</strong></p>
            </div>
        </div>
    </div>
</body>
</html>`;

            const emailMessage = this.createEmailMessage(userEmail, subject, bodyText, bodyHtml);

            const result = await this.gmail.users.messages.send({
                userId: 'me',
                resource: emailMessage
            });

            return {
                success: true,
                messageId: result.data.id,
                message: `Reminder notification sent successfully to ${userEmail}`
            };

        } catch (error) {
            console.error('Error sending reminder notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getTimeUntilDue(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const timeDiff = due - now;
        
        if (timeDiff < 0) return 'Overdue';
        
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} and ${hours} hour${hours > 1 ? 's' : ''}`;
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

}

export { GmailNotificationService };
export const gmailService = new GmailNotificationService();
