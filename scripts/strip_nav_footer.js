import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToClean = [
  'Discover.tsx',
  'ListedAdvisors.tsx',
  'FeaturedAdvisors.tsx',
  'Explore.tsx',
  'AdvisorProfile.tsx',
  'Profile.tsx',
  'Notifications.tsx',
  'Subscriptions.tsx',
  'TraderDashboard.tsx',
  'AdvisorDashboard.tsx',
  'AdminDashboard.tsx',
  'PaymentSuccess.tsx'
];

const dir = path.join(__dirname, '..', 'src', 'pages');

for (const file of filesToClean) {
  const filePath = path.join(dir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove imports
    content = content.replace(/import\s*{\s*Navbar\s*}\s*from\s*['"]@\/components\/Navbar['"];?\n?/g, '');
    content = content.replace(/import\s*{\s*Footer\s*}\s*from\s*['"]@\/components\/Footer['"];?\n?/g, '');
    
    // Remove components
    content = content.replace(/<Navbar\s*\/>\n?/g, '');
    content = content.replace(/<Footer\s*\/>\n?/g, '');
    
    // Minor cleanup for min-h-screen
    content = content.replace(/min-h-screen/g, 'min-h-full h-full');

    fs.writeFileSync(filePath, content);
    console.log(`Cleaned ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
