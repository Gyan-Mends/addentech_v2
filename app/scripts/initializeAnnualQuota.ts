import mongoose from 'mongoose';
import '../mongoose.server';

// Initialize Annual Leave Quota for all employees
async function initializeAnnualQuota() {
    try {
        console.log('🇬🇭 Initializing Annual Leave Quota for Ghana compliance...');

        // Get models
        const Registration = mongoose.models.Registration || mongoose.model('Registration', new mongoose.Schema({}), 'registrations');
        const LeaveBalance = mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', new mongoose.Schema({}), 'leavebalances');

        const employees = await Registration.find({ isActive: true });
        const currentYear = new Date().getFullYear();
        let updatedCount = 0;

        for (const employee of employees) {
            // Check if employee already has annual quota
            const existingQuota = await LeaveBalance.findOne({
                employee: employee._id,
                leaveType: 'Annual Leave Quota',
                year: currentYear
            });

            if (!existingQuota) {
                // Create annual quota
                const annualQuota = new LeaveBalance({
                    employee: employee._id,
                    leaveType: 'Annual Leave Quota',
                    year: currentYear,
                    totalAllocated: 15, // Ghana law: 15 days annual leave
                    used: 0,
                    pending: 0,
                    carriedForward: 0,
                    remaining: 15,
                    lastUpdated: new Date(),
                    transactions: [{
                        type: 'allocated',
                        amount: 15,
                        date: new Date(),
                        description: 'Annual leave quota as per Ghana Labor Law (15 days)'
                    }]
                });

                await annualQuota.save();
                updatedCount++;
                console.log(`✓ Created annual quota for: ${employee.firstName} ${employee.lastName}`);
            } else {
                console.log(`- Annual quota already exists for: ${employee.firstName} ${employee.lastName}`);
            }
        }

        console.log(`\n🎉 Annual quota initialization completed!`);
        console.log(`📊 Summary:`);
        console.log(`• Total employees: ${employees.length}`);
        console.log(`• New quotas created: ${updatedCount}`);
        console.log(`• Already existing: ${employees.length - updatedCount}`);
        console.log(`\n📋 Ghana Labor Law Compliance:`);
        console.log(`• Each employee now has 15 days annual leave quota`);
        console.log(`• Sick Leave and Maternity Leave don't count against this quota`);
        console.log(`• All other leave types will deduct from the 15-day annual limit`);

    } catch (error) {
        console.error('❌ Error initializing annual quota:', error);
        throw error;
    }
}

// Run the initialization
if (require.main === module) {
    initializeAnnualQuota()
        .then(() => {
            console.log('✅ Annual quota initialization completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Failed to initialize annual quota:', error);
            process.exit(1);
        });
}

export { initializeAnnualQuota }; 