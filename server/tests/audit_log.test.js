const request = require('supertest');
const app = require('../server');

describe('Rate Audit Log API Tests', () => {
    describe('GET /api/rate-audit-log', () => {
        it('should return audit log entries', async () => {
            const response = await request(app)
                .get('/api/rate-audit-log')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);

            // Verify structure of first entry
            const firstEntry = response.body.data[0];
            expect(firstEntry).toHaveProperty('id');
            expect(firstEntry).toHaveProperty('rate_id');
            expect(firstEntry).toHaveProperty('change_type');
            expect(firstEntry).toHaveProperty('field_name');
            expect(firstEntry).toHaveProperty('admin_id');
            expect(firstEntry).toHaveProperty('created_at');
        });

        it('should filter by rate_id when provided', async () => {
            const response = await request(app)
                .get('/api/rate-audit-log?rate_id=1246')
                .expect(200);

            expect(response.body.data).toBeDefined();
            response.body.data.forEach(entry => {
                expect(entry.rate_id).toBe('1246');
            });
        });
    });

    describe('POST /api/rate-audit-log', () => {
        it('should create a new audit log entry', async () => {
            const newEntry = {
                rate_id: '9999',
                corridor: 'TEST → TEST',
                change_type: 'RATE',
                field_name: 'Test Field',
                old_value: '1.0',
                new_value: '2.0',
                admin_id: 'test_admin',
                admin_name: 'Test Admin'
            };

            const response = await request(app)
                .post('/api/rate-audit-log')
                .send(newEntry)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('id');
            expect(typeof response.body.id).toBe('number');
        });

        it('should fail with missing required fields', async () => {
            const invalidEntry = {
                corridor: 'TEST → TEST',
                old_value: '1.0'
            };

            const response = await request(app)
                .post('/api/rate-audit-log')
                .send(invalidEntry)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });
});
