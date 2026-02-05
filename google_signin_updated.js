// Replace the existing googleSignIn function (starting at line 616) with this:

exports.googleSignIn = async (req, res) => {
  try {
    const { idToken, role } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ message: 'Google ID token is required' });
    }
    
    if (!role || !['customer', 'farmer', 'transporter', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (customer/farmer/transporter/admin) is required' });
    }
    
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;
    
    const Model = getModelByRole(role);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    let user = await Model.findOne({ where: { email } });
    
    if (!user) {
      const userData = {
        email,
        name,
        image_url: picture,
        google_id: googleId,
        password: Math.random().toString(36).slice(-8)
      };
      
      if (role === 'customer') {
        userData.first_login_completed = true;
        user = await CustomerUser.create(userData);
        const token = jwt.sign({ customer_id: user.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        return res.json({ message: 'Google Sign-In successful', token, user: { id: user.customer_id, email: user.email, name: user.name, role: 'customer' } });
      } else if (role === 'farmer') {
        userData.unique_id = generateVerificationCode();
        userData.verification_status = 'pending';
        user = await FarmerUser.create(userData);
        return res.json({ message: 'Farmer account created. Awaiting admin verification.', user: { id: user.farmer_id, email: user.email, name: user.name, role: 'farmer', verification_status: 'pending' } });
      } else if (role === 'transporter') {
        userData.verified_status = 'pending';
        user = await TransporterUser.create(userData);
        return res.json({ message: 'Transporter account created. Awaiting admin verification.', user: { id: user.transporter_id, email: user.email, name: user.name, role: 'transporter', verified_status: 'pending' } });
      } else if (role === 'admin') {
        userData.role = 'admin';
        userData.is_active = true;
        user = await AdminUser.create(userData);
        const token = jwt.sign({ admin_id: user.admin_id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
        return res.json({ message: 'Admin account created successfully.', token, user: { id: user.admin_id, email: user.email, name: user.name, role: 'admin' } });
      }
    }
    
    if (role === 'customer') {
      const token = jwt.sign({ customer_id: user.customer_id, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      return res.json({ message: 'Google Sign-In successful', token, user: { id: user.customer_id, email: user.email, name: user.name, role: 'customer' } });
    } else if (role === 'farmer') {
      if (user.verification_status === 'pending') return res.status(403).json({ message: 'Your account is pending admin verification' });
      if (user.verification_status === 'rejected') return res.status(403).json({ message: 'Your account has been rejected' });
      const token = jwt.sign({ farmer_id: user.farmer_id, role: 'farmer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      return res.json({ message: 'Google Sign-In successful', token, user: { id: user.farmer_id, email: user.email, name: user.name, role: 'farmer' } });
    } else if (role === 'transporter') {
      if (user.verified_status === 'pending') return res.status(403).json({ message: 'Your account is pending admin verification' });
      const token = jwt.sign({ transporter_id: user.transporter_id, role: 'transporter' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      return res.json({ message: 'Google Sign-In successful', token, user: { id: user.transporter_id, email: user.email, name: user.name, role: 'transporter' } });
    } else if (role === 'admin') {
      if (!user.is_active) return res.status(403).json({ message: 'Admin account is deactivated' });
      await user.update({ last_login: new Date() });
      const token = jwt.sign({ admin_id: user.admin_id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      return res.json({ message: 'Google Sign-In successful', token, user: { id: user.admin_id, email: user.email, name: user.name, role: 'admin' } });
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
    res.status(500).json({ message: 'Error with Google Sign-In', error: error.message });
  }
};
