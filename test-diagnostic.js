const http = require('http');
const path = require('path');
const fs = require('fs');

// Load .env
if (fs.existsSync(path.join(__dirname, '.env'))) {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            if (!process.env[key]) process.env[key] = value;
        }
    });
}

const dbManager = require('./api/database.js');

async function runDiagnostic() {
    console.log('=== TEST 1: DB MANAGER TEST ===');
    await dbManager.initDatabase();

    const parentPhone = '05321112233';
    const childPhone = '05334445566';

    console.log('1. Creating family with parent...');
    const parentUser = {
        id: 'usr_parent_' + Date.now(),
        phone: parentPhone,
        name: 'Ahmet Uysal',
        role: 'Baba',
        avatar: '👨'
    };
    const family = await dbManager.createFamily('Uysal Ailesi', 'UYS999', parentUser);
    console.log('Family created with id:', family.id);

    console.log('2. Adding child member from inside account...');
    const childUser = {
        id: 'usr_child_' + Date.now(),
        phone: childPhone,
        name: 'Ayşe Uysal',
        role: 'Kız',
        avatar: '👧'
    };
    const updatedFamily = await dbManager.addUserToFamily(family.id, childUser);
    console.log('Members in updatedFamily:', updatedFamily.members.map(m => m.name + ' (' + m.phone + ')'));

    console.log('3. Testing login with child phone in various formats...');
    const testFormats = [
        childPhone,                 // 05334445566
        '5334445566',               // 5334445566
        '0533 444 55 66',           // formatted
        '+905334445566',            // +90
        ' 05334445566 '             // whitespace
    ];

    for (const fmt of testFormats) {
        const found = await dbManager.findUserAndFamilyByPhone(fmt);
        if (found) {
            console.log(`✅ SUCCESS for format "${fmt}": Found user ${found.user.name} in family ${found.family.name}`);
        } else {
            console.log(`❌ FAILED for format "${fmt}": Not found!`);
        }
    }
}

runDiagnostic().catch(console.error);
