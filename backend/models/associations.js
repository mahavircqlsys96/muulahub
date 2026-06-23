module.exports = (db) => {
  const {
    users, services, services_categories, bookings, payments,
    posts, post_likes, post_comments, followers, notifications,
    provider_verifications, withdrawal_requests, reports,
    provider_categories, disputes, wallet_transactions,
    portfolio_images, contact_support, rating, post_media,
    comment_likes
  } = db;

  // Users <-> Services (provider)
  if (users && services) {
    users.hasOne(services, { foreignKey: 'providerId', as: 'service' });
    services.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
  }

  // Users <-> Portfolio Images
  if (users && portfolio_images) {
    users.hasMany(portfolio_images, { foreignKey: 'providerId', as: 'portfolio_images' });
    portfolio_images.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
  }

  // Services <-> Categories
  if (services && services_categories) {
    services.belongsTo(services_categories, { foreignKey: 'categoryId', as: 'category' });
    services_categories.hasMany(services, { foreignKey: 'categoryId', as: 'services' });
  }

  // Posts <-> Categories
  if (posts && services_categories) {
    posts.belongsTo(services_categories, { foreignKey: 'categoryId', as: 'category' });
  }

  // Bookings
  if (bookings && users) {
    bookings.belongsTo(users, { foreignKey: 'userId', as: 'user' });
    bookings.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
    users.hasMany(bookings, { foreignKey: 'userId', as: 'userBookings' });
    users.hasMany(bookings, { foreignKey: 'providerId', as: 'providerBookings' });
  }

  if (bookings && services) {
    bookings.belongsTo(services, { foreignKey: 'serviceId', as: 'service' });
    services.hasMany(bookings, { foreignKey: 'serviceId', as: 'bookings' });
  }

  // Payments
  if (payments && bookings) {
    payments.belongsTo(bookings, { foreignKey: 'bookingId', as: 'booking' });
    bookings.hasOne(payments, { foreignKey: 'bookingId', as: 'payment' });
  }

  if (payments && users) {
    payments.belongsTo(users, { foreignKey: 'userId', as: 'payer' });
  }

  // Posts <-> Media
  if (posts && post_media) {
    posts.hasMany(post_media, { foreignKey: 'postId', as: 'postMedia' });
    post_media.belongsTo(posts, { foreignKey: 'postId', as: 'post' });
  }

  // Posts <-> Users
  if (posts && users) {
    posts.belongsTo(users, { foreignKey: 'userId', as: 'user' });
    users.hasMany(posts, { foreignKey: 'userId', as: 'posts' });
  }

  // Post Likes
  if (post_likes && users) {
    post_likes.belongsTo(users, { foreignKey: 'userId', as: 'liker' });
  }
  if (post_likes && posts) {
    post_likes.belongsTo(posts, { foreignKey: 'postId', as: 'post' });
    posts.hasMany(post_likes, { foreignKey: 'postId', as: 'likes' });
  }

  // Post Comments
  if (post_comments && users) {
    post_comments.belongsTo(users, { foreignKey: 'userId', as: 'commenter' });
  }
  if (post_comments && posts) {
    post_comments.belongsTo(posts, { foreignKey: 'postId', as: 'post' });
    posts.hasMany(post_comments, { foreignKey: 'postId', as: 'comments' });
  }

  // Comment Likes
  if (comment_likes && users) {
    comment_likes.belongsTo(users, { foreignKey: 'userId', as: 'liker' });
  }
  if (comment_likes && post_comments) {
    comment_likes.belongsTo(post_comments, { foreignKey: 'commentId', as: 'comment' });
    post_comments.hasMany(comment_likes, { foreignKey: 'commentId', as: 'likes' });
  }

  // Followers
  if (followers && users) {
    followers.belongsTo(users, { foreignKey: 'followerId', as: 'follower' });
    followers.belongsTo(users, { foreignKey: 'followingId', as: 'following' });
  }

  // Notifications
  if (notifications && users) {
    notifications.belongsTo(users, { foreignKey: 'userId', as: 'recipient' });
    notifications.belongsTo(users, { foreignKey: 'senderId', as: 'sender' });
  }

  // Provider Verifications
  if (provider_verifications && users) {
    provider_verifications.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
    users.hasMany(provider_verifications, { foreignKey: 'providerId', as: 'verifications' });
  }

  // Withdrawal Requests
  if (withdrawal_requests && users) {
    withdrawal_requests.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
    users.hasMany(withdrawal_requests, { foreignKey: 'providerId', as: 'withdrawals' });
  }

  // Reports
  if (reports && users) {
    reports.belongsTo(users, { foreignKey: 'reportBy', as: 'reporter' });
  }

  // Provider Categories
  if (provider_categories && users) {
    provider_categories.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
    users.hasMany(provider_categories, { foreignKey: 'providerId', as: 'providerCategories' });
  }
  if (provider_categories && services_categories) {
    provider_categories.belongsTo(services_categories, { foreignKey: 'categoryId', as: 'category' });
    services_categories.hasMany(provider_categories, { foreignKey: 'categoryId', as: 'providers' });
  }

  // Disputes
  if (disputes && bookings) {
    disputes.belongsTo(bookings, { foreignKey: 'bookingId', as: 'booking' });
    bookings.hasOne(disputes, { foreignKey: 'bookingId', as: 'dispute' });
  }
  if (disputes && users) {
    disputes.belongsTo(users, { foreignKey: 'userId', as: 'user' });
    disputes.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
  }

  // Wallet Transactions
  if (wallet_transactions && users) {
    wallet_transactions.belongsTo(users, { foreignKey: 'userId', as: 'user' });
    users.hasMany(wallet_transactions, { foreignKey: 'userId', as: 'transactions' });
  }

  users.hasMany(users, { as: "referrals", foreignKey: "referredBy" });
  users.belongsTo(users, { as: "referrer", foreignKey: "referredBy" });

  // Contact Support
  if (contact_support && users) {
    contact_support.belongsTo(users, { foreignKey: 'userId', as: 'user' });
    users.hasMany(contact_support, { foreignKey: 'userId', as: 'support_tickets' });
  }

  // Rating
  if (rating && users) {
    rating.belongsTo(users, { foreignKey: 'userId', as: 'user' });
    rating.belongsTo(users, { foreignKey: 'providerId', as: 'provider' });
    users.hasMany(rating, { foreignKey: 'userId', as: 'givenRatings' });
    users.hasMany(rating, { foreignKey: 'providerId', as: 'receivedRatings' });
  }

  if (rating && bookings) {
    rating.belongsTo(bookings, { foreignKey: 'bookingId', as: 'booking' });
    bookings.hasOne(rating, { foreignKey: 'bookingId', as: 'rating' });
  }
};
