const fs = require('fs');

const firstNames = ['John', 'Jane', 'Peter', 'Mary', 'David', 'Susan', 'Michael', 'Jennifer', 'William', 'Linda', 'James', 'Patricia', 'Robert', 'Barbara', 'Richard', 'Elizabeth', 'Charles', 'Jessica', 'Joseph', 'Sarah'];
const lastNames = ['Doe', 'Smith', 'Jones', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez'];
const cities = ['New York', 'London', 'Paris', 'Tokyo', 'Sydney', 'Moscow', 'Cairo', 'Beijing', 'Rio de Janeiro', 'Berlin', 'New Delhi', 'Madrid', 'Rome', 'Toronto', 'Mexico City', 'Buenos Aires', 'Seoul', 'Jakarta', 'Lagos', 'Karachi'];

let newSampleData = [];
for (let i = 21; i <= 120; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const age = Math.floor(Math.random() * 40) + 20;
    const city = cities[Math.floor(Math.random() * cities.length)];
    newSampleData.push(`    { id: ${i}, name: '${firstName} ${lastName}', age: ${age}, city: '${city}' }`);
}

const filePath = 'f:\\Development\\202509\\jadeGrid\\sampledata.js';
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }

    const closingBracketIndex = data.lastIndexOf(']');
    if (closingBracketIndex === -1) {
        console.error('Could not find the closing bracket of the sampleData array.');
        return;
    }

    // Ensure there's a comma before adding new data if the array is not empty
    const lastCharIndex = data.substring(0, closingBracketIndex).trim().lastIndexOf('}');
    let newDataString = '';
    if (lastCharIndex !== -1) {
        newDataString = ',\n' + newSampleData.join(',\n');
    } else {
        newDataString = newSampleData.join(',\n');
    }


    const updatedData = data.slice(0, closingBracketIndex) + newDataString + '\n' + data.slice(closingBracketIndex);

    fs.writeFile(filePath, updatedData, 'utf8', (err) => {
        if (err) {
            console.error('Error writing file:', err);
            return;
        }
        console.log('Successfully added 100 more sample data entries.');
    });
});