const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

// 1. Clean generated/ directories, keeping .gitkeep
const generatedDirs = [
  'audio',
  'images',
  'json',
  'metadata',
  'scripts',
  'subtitles',
  'thumbnails',
  'videos'
];

console.log('Cleaning generated directory...');
generatedDirs.forEach(dirName => {
  const dirPath = path.join(rootDir, 'generated', dirName);
  if (fs.existsSync(dirPath)) {
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      if (item === '.gitkeep') return;
      const itemPath = path.join(dirPath, item);
      try {
        fs.rmSync(itemPath, { recursive: true, force: true });
        console.log(`Deleted: ${itemPath}`);
      } catch (err) {
        console.error(`Failed to delete ${itemPath}:`, err.message);
      }
    });
  }
});

// 2. Clean public/content/factory/ directory
const factoryDir = path.join(rootDir, 'public', 'content', 'factory');
console.log('\nCleaning public/content/factory directory...');
if (fs.existsSync(factoryDir)) {
  const items = fs.readdirSync(factoryDir);
  items.forEach(item => {
    const itemPath = path.join(factoryDir, item);
    try {
      fs.rmSync(itemPath, { recursive: true, force: true });
      console.log(`Deleted: ${itemPath}`);
    } catch (err) {
      console.error(`Failed to delete ${itemPath}:`, err.message);
    }
  });
}

// 3. Clean images/ and audio/ subfolders inside manual projects under public/content/
const contentDir = path.join(rootDir, 'public', 'content');
console.log('\nCleaning images/ and audio/ in manual project directories...');
if (fs.existsSync(contentDir)) {
  const projects = fs.readdirSync(contentDir);
  projects.forEach(project => {
    if (project === 'factory') return; // already handled above
    const projectPath = path.join(contentDir, project);
    
    // Check if it is a directory
    const stat = fs.statSync(projectPath);
    if (!stat.isDirectory()) return;
    
    ['images', 'audio'].forEach(subDir => {
      const subDirPath = path.join(projectPath, subDir);
      if (fs.existsSync(subDirPath)) {
        const items = fs.readdirSync(subDirPath);
        items.forEach(item => {
          if (item === '.gitkeep') return;
          const itemPath = path.join(subDirPath, item);
          try {
            fs.rmSync(itemPath, { recursive: true, force: true });
            console.log(`Deleted project asset: ${itemPath}`);
          } catch (err) {
            console.error(`Failed to delete project asset ${itemPath}:`, err.message);
          }
        });
      }
    });
  });
}

console.log('\nCleanup completed successfully!');
