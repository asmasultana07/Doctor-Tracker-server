function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

function buildDateFilter(req, field = "createdAt") {
  const { from, to } = req.query;
  if (!from && !to) {
    return {};
  }

  const range = {};
  if (from) {
    range.$gte = new Date(from);
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return { [field]: range };
}

module.exports = { parsePagination, buildDateFilter };
