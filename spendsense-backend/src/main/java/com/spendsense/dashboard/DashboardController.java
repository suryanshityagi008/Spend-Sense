
package com.spendsense.dashboard;

import com.spendsense.transaction.Transaction;
import com.spendsense.transaction.TransactionRepository;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final TransactionRepository repository;

    public DashboardController(TransactionRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/summary")
    public Map<String, Object> summary(
            @RequestParam String userEmail) {

        if (userEmail == null || userEmail.isBlank()
                || !userEmail.contains("@")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A valid userEmail is required"
            );
        }

        String email = userEmail.trim().toLowerCase();

        List<Transaction> transactions =
            repository.findByUserEmailOrderByDateDescIdDesc(email);

        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expenses = BigDecimal.ZERO;
        BigDecimal monthExpenses = BigDecimal.ZERO;

        LocalDate today = LocalDate.now();

        for (Transaction transaction : transactions) {
            if ("income".equals(transaction.getType())) {
                income = income.add(transaction.getAmount());
            } else if ("expense".equals(transaction.getType())) {
                expenses = expenses.add(transaction.getAmount());

                LocalDate date = transaction.getDate();

                if (date.getYear() == today.getYear()
                        && date.getMonth() == today.getMonth()) {
                    monthExpenses =
                        monthExpenses.add(transaction.getAmount());
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalIncome", income);
        result.put("totalExpenses", expenses);
        result.put("balance", income.subtract(expenses));
        result.put("currentMonthExpenses", monthExpenses);
        result.put("transactionCount", transactions.size());

        return result;
    }
}

