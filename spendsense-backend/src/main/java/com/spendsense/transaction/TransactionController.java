
package com.spendsense.transaction;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionRepository repository;

    public TransactionController(TransactionRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Transaction> getAll(
            @RequestParam String userEmail) {
        return repository.findByUserEmailOrderByDateDescIdDesc(
            normalizeEmail(userEmail)
        );
    }

    @GetMapping("/{id}")
    public Transaction getOne(
            @PathVariable Long id,
            @RequestParam String userEmail) {
        return findOwned(id, userEmail);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Transaction create(
            @Valid @RequestBody Transaction transaction) {
        transaction.setId(null);
        transaction.setUserEmail(
            normalizeEmail(transaction.getUserEmail())
        );
        return repository.save(transaction);
    }

    @PutMapping("/{id}")
    public Transaction update(
            @PathVariable Long id,
            @RequestParam String userEmail,
            @Valid @RequestBody Transaction input) {

        Transaction existing = findOwned(id, userEmail);

        existing.setTitle(input.getTitle());
        existing.setAmount(input.getAmount());
        existing.setType(input.getType());
        existing.setCategory(input.getCategory());
        existing.setDate(input.getDate());

        return repository.save(existing);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long id,
            @RequestParam String userEmail) {
        repository.delete(findOwned(id, userEmail));
    }

    private Transaction findOwned(Long id, String email) {
        String normalized = normalizeEmail(email);

        Transaction transaction = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Transaction not found"
            ));

        if (!transaction.getUserEmail().equals(normalized)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Transaction not found"
            );
        }

        return transaction;
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()
                || !email.contains("@")) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A valid userEmail is required"
            );
        }

        return email.trim().toLowerCase();
    }
}
