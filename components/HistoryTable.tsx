'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";

type Transaction = {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  hash?: string;
  block?: string;
  fee?: string;
  method?: string;
};

interface HistoryTableProps {
  address: string;
}

export default function HistoryTable({ address }: HistoryTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/transactions?address=${address}`);
      const data = await response.json();
      if (response.ok && data.transactions) {
        setTransactions(data.transactions);
        setTotalPages(Math.ceil(data.transactions.length / 50));
      } else {
        toast({
          title: "Error fetching transactions",
          description: data.message || "Unexpected response format.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error fetching transactions",
        description: "Failed to fetch transactions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp * 1000;

    if (diff < 0) return "Just now";

    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} secs ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hrs ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const truncateAddress = (address: string) => {
    if (!address || address.length < 10) return "Invalid Address";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDownload = () => {
    const headers = ['Transaction Hash', 'Method', 'Block', 'Age', 'From', 'To', 'Amount', 'Txn Fee'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(tx =>
        [
          tx.hash,
          tx.method,
          tx.block,
          new Date(tx.timestamp * 1000).toISOString(),
          tx.from,
          tx.to,
          tx.amount.toFixed(6),
          tx.fee,
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${address}_transactions.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-white">Latest {transactions.length} transactions for {truncateAddress(address)}</p>
            <p className="text-gray-400 text-sm">(Auto-updating)</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-orange-500"
            onClick={handleDownload}
          >
            <Download size={16} />
            {!isMobile && "Download Data"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full border rounded-2xl">
            <TableHeader>
              <TableRow>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 bg-white text-black">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : transactions.length > 0 ? (
                transactions.map((tx, index) => (
                  <TableRow key={index}>
                    <TableCell>{tx.hash ? truncateAddress(tx.hash) : "N/A"}</TableCell>
                    <TableCell>{truncateAddress(tx.from)}</TableCell>
                    <TableCell>{truncateAddress(tx.to)}</TableCell>
                    <TableCell>{tx.amount.toFixed(6)} ETH</TableCell>
                    <TableCell>{getRelativeTime(tx.timestamp)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 bg-white text-black">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft />
            Previous
          </Button>
          <p>
            Page {currentPage} of {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
