const { faqs } = require('../../models');
const helper = require('../../helpers/helper');

module.exports = {
  getFaqs: async (req, res) => {
    try {
      const allFaqs = await faqs.findAll({ order: [['createdAt', 'DESC']] });
      return helper.success(res, "FAQs retrieved successfully", allFaqs);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },

  addFaq: async (req, res) => {
    const { question, answer } = req.body;
    try {
      if (!question || !answer) {
        return helper.failed(res, "Question and answer are required");
      }
      const newFaq = await faqs.create({ question, answer });
      return helper.success(res, "FAQ added successfully", newFaq);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },

  updateFaq: async (req, res) => {
    const { id } = req.params;
    const { question, answer } = req.body;
    try {
      const faq = await faqs.findOne({ where: { id } });
      if (!faq) {
        return helper.failed(res, "FAQ not found");
      }
      await faq.update({ question, answer });
      return helper.success(res, "FAQ updated successfully", faq);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },

  toggleStatus: async (req, res) => {
    const { id } = req.params;
    try {
      const faq = await faqs.findOne({ where: { id } });
      if (!faq) {
        return helper.failed(res, "FAQ not found");
      }
      const newStatus = faq.status === 'active' ? 'inactive' : 'active';
      await faq.update({ status: newStatus });
      return helper.success(res, "FAQ status updated successfully", faq);
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  },

  deleteFaq: async (req, res) => {
    const { id } = req.params;
    try {
      const faq = await faqs.findOne({ where: { id } });
      if (!faq) {
        return helper.failed(res, "FAQ not found");
      }
      await faq.destroy();
      return helper.success(res, "FAQ deleted successfully");
    } catch (err) {
      console.log(err);
      return helper.failed(res, "Something went wrong");
    }
  }
};
