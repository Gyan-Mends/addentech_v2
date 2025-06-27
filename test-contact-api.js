// Test script for POST contact API
const testContactAPI = async () => {
  const baseUrl = 'http://localhost:5173'; // Adjust if your dev server runs on different port
  
  const testContact = {
    firstName: "John",
    middleName: "Michael",
    lastName: "Doe",
    number: "+1234567890",
    company: "Test Company Inc.",
    description: "This is a test contact message to verify the API functionality."
  };

  try {
    console.log('🧪 Testing POST /api/contacts...');
    console.log('📝 Test data:', testContact);

    const response = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testContact)
    });

    const result = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📄 Response body:', JSON.stringify(result, null, 2));

    if (response.ok && result.success) {
      console.log('✅ Contact API test PASSED!');
      console.log('🆔 Created contact ID:', result.contact._id);
    } else {
      console.log('❌ Contact API test FAILED!');
      console.log('🚨 Error:', result.error);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
};

// Run the test
testContactAPI(); 