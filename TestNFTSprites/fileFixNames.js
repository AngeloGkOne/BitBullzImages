const fs = require('fs').promises;
const path = require('path');

async function manageFiles(directory) {
  try {
    // Define the specific files to keep for each rarity (excluding Common)
    const filesToKeep = {
      Rare: ['13_BBTap_Rare.png', '14_BBTap_Rare.png', '23_BBTap_Rare.png', '4_BBTap_Rare.png'], // Keep these 4
      Epic: ['24_BBTap_Epic.png', '22_BBTap_Epic.png'], // Keep these 2
      Legendary: ['15_BBTap_Legendary.png'], // Keep this 1
    };

    // Define the total limits for each rarity
    const limits = {
      Rare: 4,
      Epic: 2,
      Legendary: 1,
      Common: 20,
    };

    // Read all files in the directory
    const files = await fs.readdir(directory);

    // Group files by rarity
    const fileGroups = {
      Rare: [],
      Epic: [],
      Legendary: [],
      Common: [],
    };

    // Categorize files by rarity
    for (const file of files) {
      const match = file.match(/^\d+_BBTap_([^.]+)\.png$/);
      if (match) {
        const rarity = match[1];
        if (fileGroups[rarity]) {
          fileGroups[rarity].push(file);
        }
      }
    }

    // Step 1: Collect all files to keep based on filesToKeep
    let allFilesToKeep = [];
    const usedPrefixes = new Set();

    for (const rarity in filesToKeep) {
      const specifiedFiles = filesToKeep[rarity] || [];
      const filesInGroup = fileGroups[rarity];
      let filesToKeepInGroup = filesInGroup.filter(file => specifiedFiles.includes(file));

      // If we don't have enough specified files, fill with others
      if (filesToKeepInGroup.length < limits[rarity]) {
        const additionalFiles = filesInGroup
          .filter(file => !specifiedFiles.includes(file))
          .slice(0, limits[rarity] - filesToKeepInGroup.length);
        filesToKeepInGroup = filesToKeepInGroup.concat(additionalFiles);
      }

      // Track the prefixes of the files we're keeping
      filesToKeepInGroup.forEach(file => {
        const prefix = parseInt(file.split('_')[0]);
        usedPrefixes.add(prefix);
        allFilesToKeep.push({ file, rarity });
      });
    }

    // Step 2: For Common, select files that don't conflict with used prefixes
    const commonFiles = fileGroups.Common.filter(file => {
      const prefix = parseInt(file.split('_')[0]);
      return !usedPrefixes.has(prefix);
    }).slice(0, limits.Common);

    commonFiles.forEach(file => {
      const prefix = parseInt(file.split('_')[0]);
      usedPrefixes.add(prefix);
      allFilesToKeep.push({ file, rarity: 'Common' });
    });

    // Step 3: Delete all files that conflict with used prefixes or are excess
    for (const rarity in fileGroups) {
      const filesInGroup = fileGroups[rarity];
      for (const file of filesInGroup) {
        const prefix = parseInt(file.split('_')[0]);
        const isKept = allFilesToKeep.some(f => f.file === file);
        if (!isKept && usedPrefixes.has(prefix)) {
          await fs.unlink(path.join(directory, file));
          console.log(`Deleted (prefix conflict): ${file}`);
        } else if (!isKept) {
          await fs.unlink(path.join(directory, file));
          console.log(`Deleted (excess): ${file}`);
        }
      }
    }

    // Step 4: Group files by rarity for renaming
    const filesByRarity = {
      Rare: [],
      Epic: [],
      Legendary: [],
      Common: [],
    };

    allFilesToKeep.forEach(({ file, rarity }) => {
      filesByRarity[rarity].push(file);
    });

    // Step 5: Rename files within each rarity to start from 1
    for (const rarity in filesByRarity) {
      const filesInGroup = filesByRarity[rarity];
      // Sort by original prefix to maintain order
      filesInGroup.sort((a, b) => {
        const numA = parseInt(a.split('_')[0]);
        const numB = parseInt(b.split('_')[0]);
        return numA - numB;
      });

      // Rename starting from 1 within this rarity
      for (let i = 0; i < filesInGroup.length; i++) {
        const oldName = filesInGroup[i];
        const newName = `${i + 1}_BBTap_${rarity}.png`;
        await fs.rename(
          path.join(directory, oldName),
          path.join(directory, newName)
        );
        console.log(`Renamed: ${oldName} -> ${newName}`);
      }
    }

    console.log('File management completed.');
  } catch (error) {
    console.error('Error managing files:', error);
  }
}

// Example usage: node renameFiles.js ./path/to/your/folder
const directoryPath = process.argv[2];
if (!directoryPath) {
  console.error('Please provide a directory path as an argument.');
  process.exit(1);
}

manageFiles(directoryPath);