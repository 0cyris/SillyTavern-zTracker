import { includeZTrackerMessages } from './src/tracker.js';

const settings = {
    includeLastXZTrackerMessages: 1,
    embedZTrackerRole: 'system',
    embedZTrackerAsCharacter: false,
    embedZTrackerSnapshotHeader: '### Tracker',
    embedZTrackerSnapshotTransformPreset: 'none',
};

const messages = [
    {
        content: 'Hello',
        role: 'user',
        extra: {
            ztracker: {
                value: {
                    lang: 'json',
                    text: '{"stats": "good"}',
                    wrapInCodeFence: true
                }
            }
        }
    }
];

const result = includeZTrackerMessages(messages, settings as any);
console.log('Resulting Messages:');
console.log(JSON.stringify(result, null, 2));
