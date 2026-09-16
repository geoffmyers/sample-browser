"use client";

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  pages,
  total,
  perPage,
  onPageChange,
}: PaginationProps) {
  if (pages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const numbers: (number | string)[] = [];
    const showEllipsis = pages > 7;

    if (!showEllipsis) {
      for (let i = 1; i <= pages; i++) {
        numbers.push(i);
      }
    } else {
      numbers.push(1);

      if (page > 3) {
        numbers.push("...");
      }

      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) {
        numbers.push(i);
      }

      if (page < pages - 2) {
        numbers.push("...");
      }

      numbers.push(pages);
    }

    return numbers;
  };

  return (
    <div className="pagination">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {getPageNumbers().map((num, idx) =>
        typeof num === "number" ? (
          <button
            key={idx}
            onClick={() => onPageChange(num)}
            className={page === num ? "active" : ""}
          >
            {num}
          </button>
        ) : (
          <span key={idx} className="pagination-info">
            ...
          </span>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages}
        aria-label="Next page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      <span className="pagination-info">
        {start}-{end} of {total}
      </span>
    </div>
  );
}
